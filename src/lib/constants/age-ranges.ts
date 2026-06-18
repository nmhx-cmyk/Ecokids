import { AgeRange } from '@prisma/client';

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  NEWBORN_0_1: 'Sơ sinh 0-12 tháng',
  TODDLER_1_3: '1-3 tuổi',
  KID_3_6: '3-6 tuổi',
  KID_6_12: '6-12 tuổi',
};
