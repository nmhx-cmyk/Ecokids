// One-off maintenance script: replace existing ProductImage rows with the
// curated Unsplash photos from product-images.ts. Use this to fix a DB that was
// seeded with the old random picsum images without doing a full reset/reseed.
//
//   pnpm dlx dotenv -e .env.local -- tsx prisma/refresh-images.ts
//   (or: npm run db:refresh-images if a script is added)

import { PrismaClient } from "@prisma/client";
import { imagesForProduct } from "./product-images";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      category: { select: { slug: true } },
    },
  });

  console.log(`🖼️  Refreshing images for ${products.length} products...\n`);

  let updated = 0;
  for (const p of products) {
    const categorySlug = p.category?.slug;
    if (!categorySlug) {
      console.warn(`⚠️  Bỏ qua ${p.slug}: không có category`);
      continue;
    }

    const images = imagesForProduct(p.slug, p.name, categorySlug);
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: p.id } }),
      prisma.productImage.createMany({
        data: images.map((img) => ({ productId: p.id, ...img })),
      }),
    ]);

    updated++;
    console.log(`✓ ${p.slug} (${images.length} ảnh)`);
  }

  console.log(`\n✅ Đã cập nhật ảnh cho ${updated}/${products.length} sản phẩm.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("❌ Refresh thất bại:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
