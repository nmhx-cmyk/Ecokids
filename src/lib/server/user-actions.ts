import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
};

// Wrapped in React cache() so a single request that needs the current user
// in multiple places (Header, page body, generateMetadata) only performs the
// Supabase auth round-trip + DB lookup once instead of 2-3x.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      role: true,
    },
  });

  if (!dbUser) {
    return {
      id: user.id,
      email: user.email ?? "",
      name: null,
      phone: null,
      avatarUrl: null,
      role: "USER",
    };
  }

  return dbUser;
});

/**
 * Lightweight current-user for DISPLAY ONLY (header menu, greeting).
 *
 * Uses `getSession()` which reads the session from the cookie locally — no
 * network round-trip to Supabase Auth (unlike `getUser()`), so it does not
 * block public page rendering. The session cookie is already refreshed by the
 * middleware on every request.
 *
 * SECURITY: do NOT use this to gate access or authorize actions — a forged
 * cookie is only validated by `getUser()`. Use `requireUser`/`requireAdmin`
 * (which call `getCurrentUser` → `getUser`) for anything security-sensitive.
 */
export const getDisplayUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const sUser = session?.user;
  if (!sUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: sUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      role: true,
    },
  });

  if (!dbUser) {
    return {
      id: sUser.id,
      email: sUser.email ?? "",
      name: null,
      phone: null,
      avatarUrl: null,
      role: "USER",
    };
  }

  return dbUser;
});

export async function requireUser(redirectTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = redirectTo
      ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
      : "/login";
    redirect(target);
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=/admin");
  }
  if (user.role !== "ADMIN") {
    notFound();
  }
  return user;
}
