import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Ecokids";

  return {
    name,
    short_name: "Ecokids",
    description:
      "Thời trang trẻ em chất lượng, an toàn cho bé từ sơ sinh đến 12 tuổi.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf9",
    theme_color: "#ff6b5e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
