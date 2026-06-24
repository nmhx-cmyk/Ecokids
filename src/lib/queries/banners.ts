import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface ActiveBanner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
}

// Homepage banners change only via admin; cache and revalidate via tag "banners".
export const getActiveBanners = unstable_cache(
  async (): Promise<ActiveBanner[]> => {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, imageUrl: true, linkUrl: true },
    });
    return banners;
  },
  ["storefront-active-banners"],
  { revalidate: 300, tags: ["banners"] },
);

export async function getBanners() {
  return prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getBannerById(id: string) {
  return prisma.banner.findUnique({ where: { id } });
}
