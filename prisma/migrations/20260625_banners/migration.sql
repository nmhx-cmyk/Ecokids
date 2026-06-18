-- CreateTable
CREATE TABLE "Banner" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "linkUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Banner_isActive_sortOrder_idx" ON "Banner"("isActive", "sortOrder");

-- RLS: public read for active banners.
ALTER TABLE "Banner" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Banner: public read active" ON "Banner";
CREATE POLICY "Banner: public read active" ON "Banner"
  FOR SELECT USING ("isActive" = true);
