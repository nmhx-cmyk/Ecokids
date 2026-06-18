import Link from "next/link";
import { getCurrentUser } from "@/lib/server/user-actions";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { MobileDrawer } from "./MobileDrawer";
import { SearchTrigger } from "./SearchTrigger";
import { CartButton } from "./CartButton";

const NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Bé trai", href: "/products?gender=BOY" },
  { label: "Bé gái", href: "/products?gender=GIRL" },
  { label: "Sơ sinh", href: "/products?ageRange=NEWBORN_0_1" },
  { label: "Mới về", href: "/products?sort=new" },
  { label: "Sale", href: "/products?onSale=true" },
];

export async function Header() {
  const user = await getCurrentUser();
  const drawerUser = user
    ? { id: user.id, email: user.email, name: user.name }
    : null;
  const menuUser = user
    ? {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      }
    : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink-200/60 bg-cream-50/90 backdrop-blur">
      {/* Mobile layout */}
      <div className="container flex h-14 items-center justify-between gap-2 lg:hidden">
        <MobileDrawer user={drawerUser} />
        <div className="flex-1 text-center">
          <Logo variant="small" className="inline-flex" />
        </div>
        <div className="flex items-center gap-1">
          <SearchTrigger />
          <CartButton />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="container hidden h-16 items-center gap-6 lg:flex">
        <Logo />
        <nav aria-label="Điều hướng chính" className="flex-1">
          <ul className="flex items-center justify-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <SearchTrigger />
          <UserMenu user={menuUser} />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
