import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { OrganizationStructuredData } from "@/components/seo/OrganizationStructuredData";
import "@/styles/globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

const defaultOgImage = {
  url: `${siteUrl}/api/og?title=Ecokids`,
  width: 1200,
  height: 630,
  alt: "Ecokids",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ecokids - Thời trang trẻ em",
    template: "%s | Ecokids",
  },
  description:
    "Quần áo trẻ em chất lượng, an toàn, giá hợp lý cho bé từ sơ sinh đến 12 tuổi.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    siteName: "Ecokids",
    title: "Ecokids - Thời trang trẻ em",
    description:
      "Quần áo trẻ em chất lượng, an toàn, giá hợp lý cho bé từ sơ sinh đến 12 tuổi.",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ecokids",
    title: "Ecokids - Thời trang trẻ em",
    description:
      "Quần áo trẻ em chất lượng, an toàn, giá hợp lý cho bé từ sơ sinh đến 12 tuổi.",
    images: [defaultOgImage.url],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>
        <a href="#main-content" className="skip-link">
          Đi tới nội dung chính
        </a>
        {children}
        <Toaster richColors position="top-right" />
        <OrganizationStructuredData />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
