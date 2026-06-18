-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable: order-level discount snapshot
ALTER TABLE "Order"
  ADD COLUMN "discountTotal" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "voucherCode" TEXT;

-- CreateTable Voucher
CREATE TABLE "Voucher" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "discountType" "DiscountType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "minOrderValue" INTEGER NOT NULL DEFAULT 0,
  "maxDiscount" INTEGER,
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "perUserLimit" INTEGER,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");
CREATE INDEX "Voucher_code_idx" ON "Voucher"("code");
CREATE INDEX "Voucher_isActive_startsAt_endsAt_idx" ON "Voucher"("isActive", "startsAt", "endsAt");

-- CreateTable VoucherRedemption
CREATE TABLE "VoucherRedemption" (
  "id" TEXT NOT NULL,
  "voucherId" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "orderId" TEXT NOT NULL,
  "discount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoucherRedemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VoucherRedemption_orderId_key" ON "VoucherRedemption"("orderId");
CREATE INDEX "VoucherRedemption_voucherId_idx" ON "VoucherRedemption"("voucherId");
CREATE INDEX "VoucherRedemption_userId_idx" ON "VoucherRedemption"("userId");

-- CreateTable FlashSale
CREATE TABLE "FlashSale" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FlashSale_isActive_startsAt_endsAt_idx" ON "FlashSale"("isActive", "startsAt", "endsAt");

-- CreateTable FlashSaleItem
CREATE TABLE "FlashSaleItem" (
  "id" TEXT NOT NULL,
  "flashSaleId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "salePrice" INTEGER NOT NULL,
  CONSTRAINT "FlashSaleItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FlashSaleItem_flashSaleId_productId_key" ON "FlashSaleItem"("flashSaleId", "productId");
CREATE INDEX "FlashSaleItem_productId_idx" ON "FlashSaleItem"("productId");

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_voucherId_fkey"
  FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_flashSaleId_fkey"
  FOREIGN KEY ("flashSaleId") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- RLS
-- ============================================

-- Voucher codes are NOT publicly listable (validated server-side via Prisma).
ALTER TABLE "Voucher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoucherRedemption" ENABLE ROW LEVEL SECURITY;

-- Flash sales are public read while active (mirrors catalog public-read).
ALTER TABLE "FlashSale" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "FlashSale: public read active" ON "FlashSale";
CREATE POLICY "FlashSale: public read active" ON "FlashSale"
  FOR SELECT USING ("isActive" = true);

ALTER TABLE "FlashSaleItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "FlashSaleItem: public read" ON "FlashSaleItem";
CREATE POLICY "FlashSaleItem: public read" ON "FlashSaleItem"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "FlashSale" fs
      WHERE fs.id = "FlashSaleItem"."flashSaleId" AND fs."isActive" = true
    )
  );
