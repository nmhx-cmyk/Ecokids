import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { Sidebar } from "@/components/admin/Sidebar";
import { requireAdmin } from "@/lib/server/user-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản trị",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          title="Quản trị"
          user={{
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
          }}
        />
        <main id="main-content" className="flex-1 overflow-x-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
