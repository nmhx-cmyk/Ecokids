import "server-only";
import { prisma } from "@/lib/prisma";

export interface ActiveBanner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
}

export async function getActiveBanners(): Promise<ActiveBanner[]> {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, imageUrl: true, linkUrl: true },
  });
  return banners;
}

export async function getBanners() {
  return prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getBannerById(id: string) {
  return prisma.banner.findUnique({ where: { id } });
}
