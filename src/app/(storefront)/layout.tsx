import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { CompareBar } from "@/components/storefront/CompareBar";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <CompareBar />
    </div>
  );
}
