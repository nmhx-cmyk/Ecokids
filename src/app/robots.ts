import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/api",
        "/auth",
        "/checkout",
        "/cart",
        "/order-confirmation",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
