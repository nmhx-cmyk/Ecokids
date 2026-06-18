import type { Metadata } from "next";

import { AccountNav } from "@/components/account/AccountNav";
import { requireUser } from "@/lib/server/user-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tài khoản",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser("/account");

  return (
    <div className="container py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 sm:text-3xl">
          Tài khoản của tôi
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <AccountNav />
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}
