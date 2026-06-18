-- AlterTable: customer-uploaded review photos (public URLs in product-images bucket)
ALTER TABLE "Review" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
