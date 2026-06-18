import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Facebook,
  Instagram,
  Sparkles,
} from "lucide-react";
import { Button, Input } from "@/components/ui";

const SUPPORT_LINKS = [
  { label: "Liên hệ", href: "/contact" },
  { label: "Hướng dẫn mua hàng", href: "/guide" },
  { label: "FAQ", href: "/faq" },
] as const;

const POLICY_LINKS = [
  { label: "Đổi trả", href: "/policy/return" },
  { label: "Bảo mật", href: "/policy/privacy" },
  { label: "Vận chuyển", href: "/policy/shipping" },
  { label: "Điều khoản", href: "/policy/terms" },
] as const;

function ZaloIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 9h6l-6 6h6" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink-900 text-cream-50">
      <div className="container py-12">
        <div className="grid gap-10 lg:grid-cols-4">
          {/* Brand column */}
          <div>
            <Link
              href="/"
              aria-label="Ecokids - Trang chủ"
              className="inline-flex items-center gap-2 font-display text-2xl font-bold text-cream-50"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-coral-500/20 text-coral-500">
                <Sparkles
                  className="h-5 w-5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              Ecokids
            </Link>
            <p className="mt-4 text-sm text-cream-50/70">
              Thời trang trẻ em an toàn cho mọi bé.
            </p>
            <ul className="mt-5 flex items-center gap-3">
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cream-50/20 text-cream-50 transition-colors hover:bg-cream-50/10"
                >
                  <Instagram
                    className="h-4 w-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              </li>
              <li>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cream-50/20 text-cream-50 transition-colors hover:bg-cream-50/10"
                >
                  <Facebook
                    className="h-4 w-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              </li>
              <li>
                <a
                  href="https://zalo.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Zalo"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cream-50/20 text-cream-50 transition-colors hover:bg-cream-50/10"
                >
                  <ZaloIcon className="h-4 w-4" />
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-cream-50">
              Hỗ trợ
            </h3>
            <ul className="mt-4 space-y-2">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream-50/70 transition-colors hover:text-cream-50"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policy */}
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-cream-50">
              Chính sách
            </h3>
            <ul className="mt-4 space-y-2">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream-50/70 transition-colors hover:text-cream-50"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-cream-50">
              Theo dõi
            </h3>
            <p className="mt-4 text-sm text-cream-50/70">Đăng ký nhận tin</p>
            <form
              className="mt-3 flex gap-2"
              action="#"
              aria-label="Đăng ký nhận bản tin"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email của bạn
              </label>
              <Input
                id="newsletter-email"
                name="email"
                type="email"
                placeholder="Email của bạn"
                className="bg-cream-50 text-ink-900 placeholder:text-ink-500"
                required
              />
              <Button type="submit" variant="primary" size="md">
                Đăng ký
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="border-t border-cream-50/10">
        <div className="container flex flex-col gap-3 py-5 text-xs text-cream-50/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Ecokids. Mọi quyền được bảo lưu.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <CreditCard
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <Banknote
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="sr-only">Phương thức thanh toán</span>
            </span>
            <span>Tiếng Việt</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
