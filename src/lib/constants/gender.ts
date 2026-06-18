import { Gender } from '@prisma/client';

export const GENDER_LABELS: Record<Gender, string> = {
  BOY: 'Bé trai',
  GIRL: 'Bé gái',
  UNISEX: 'Unisex',
};
