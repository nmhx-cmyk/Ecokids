import "server-only";

import { prisma } from "@/lib/prisma";

export type UserAddress = {
  id: string;
  recipientName: string;
  phone: string;
  province: string;
  provinceCode: string;
  district: string;
  districtCode: string;
  ward: string;
  wardCode: string;
  addressLine: string;
  isDefault: boolean;
  createdAt: Date;
};

export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      recipientName: true,
      phone: true,
      province: true,
      provinceCode: true,
      district: true,
      districtCode: true,
      ward: true,
      wardCode: true,
      addressLine: true,
      isDefault: true,
      createdAt: true,
    },
  });
}
