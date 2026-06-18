-- CreateTable
CREATE TABLE "WishlistItem" (
  "id" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");
CREATE INDEX "WishlistItem_userId_createdAt_idx" ON "WishlistItem"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: private to the owner (Prisma uses a privileged connection that bypasses RLS).
ALTER TABLE "WishlistItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "WishlistItem: self all" ON "WishlistItem";
CREATE POLICY "WishlistItem: self all" ON "WishlistItem"
  FOR ALL USING (auth.uid() = "userId");
