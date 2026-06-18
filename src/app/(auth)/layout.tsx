import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tài khoản",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4 py-12"
    >
      <Link
        href="/"
        className="mb-6 font-display text-2xl font-bold text-coral-600 transition-opacity hover:opacity-80"
      >
        Ecokids
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-6 text-xs text-ink-500">© Ecokids 2026</p>
    </main>
  );
}
