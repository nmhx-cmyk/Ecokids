-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: denormalized rating aggregates on Product (recomputed on moderation)
ALTER TABLE "Product"
  ADD COLUMN "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "comment" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "adminReply" TEXT,
  "repliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_productId_key" ON "Review"("userId", "productId");
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Row-Level Security (defense-in-depth for Supabase REST; Prisma uses a
-- privileged connection that bypasses RLS).
-- ============================================

ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews (mirrors the catalog public-read pattern).
DROP POLICY IF EXISTS "Review: public read approved" ON "Review";
CREATE POLICY "Review: public read approved" ON "Review"
  FOR SELECT USING (status = 'APPROVED');

-- Authors can read their own reviews regardless of status.
DROP POLICY IF EXISTS "Review: self read" ON "Review";
CREATE POLICY "Review: self read" ON "Review"
  FOR SELECT USING (auth.uid() = "userId");
