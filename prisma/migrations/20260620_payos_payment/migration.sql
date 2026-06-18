-- AlterEnum: add PayOS as a payment method (COD + BANK_TRANSFER kept for history)
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAYOS';

-- AlterTable: PayOS online-payment columns on Order (nullable for COD / legacy orders)
ALTER TABLE "Order"
  ADD COLUMN "payosOrderCode" BIGINT,
  ADD COLUMN "paymentLinkId" TEXT,
  ADD COLUMN "paymentCheckoutUrl" TEXT,
  ADD COLUMN "paymentRef" TEXT,
  ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_payosOrderCode_key" ON "Order"("payosOrderCode");

-- CreateIndex: speeds up the expire-unpaid-PayOS-orders sweep
CREATE INDEX "Order_status_paymentStatus_paymentExpiresAt_idx"
  ON "Order"("status", "paymentStatus", "paymentExpiresAt");

-- Numeric, unique order code sequence required by the PayOS API (orderCode must be a number)
CREATE SEQUENCE IF NOT EXISTS payos_order_code_seq START 1;
