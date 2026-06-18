import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { ProductInfo } from "@/components/storefront/ProductInfo";
import { ProductReviews } from "@/components/storefront/ProductReviews";
import { ProductStructuredData } from "@/components/seo/ProductStructuredData";
import {
  getProductDetailBySlug,
  getRelatedProducts,
} from "@/lib/queries/product-detail";
import {
  getMyReviewForProduct,
  getProductReviews,
  getReviewSummary,
} from "@/lib/queries/reviews";
import { getActiveFlashForProduct } from "@/lib/queries/flash-sales";
import { getCurrentUser } from "@/lib/server/user-actions";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

interface PageProps {
  params: { slug: string };
}

const DESCRIPTION_LIMIT = 150;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const product = await getProductDetailBySlug(params.slug);
  if (!product) {
    return {
      title: "Sản phẩm không tồn tại | Ecokids",
    };
  }

  const description = product.description
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DESCRIPTION_LIMIT);

  const primaryImage =
    product.images.find((img) => img.isPrimary) ?? product.images[0] ?? null;

  const ogImageUrl = primaryImage
    ? primaryImage.url
    : `${APP_URL}/api/og?title=${encodeURIComponent(product.name)}`;
  const ogImageAlt = primaryImage?.alt || product.name;

  return {
    title: `${product.name} | Ecokids`,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: product.name,
      description,
      images: [{ url: ogImageUrl, alt: ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const [product, user] = await Promise.all([
    getProductDetailBySlug(params.slug),
    getCurrentUser(),
  ]);
  if (!product) {
    notFound();
  }

  const [related, reviewSummary, reviews, myReview, flash] = await Promise.all([
    getRelatedProducts(product.id, product.category.id, 4),
    getReviewSummary(product.id),
    getProductReviews(product.id),
    user ? getMyReviewForProduct(user.id, product.id) : Promise.resolve(null),
    getActiveFlashForProduct(product.id),
  ]);
  const isLoggedIn = user !== null;

  return (
    <div className="container max-w-7xl py-8">
      <ProductStructuredData
        product={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          images: product.images.map((img) => ({
            url: img.url,
            alt: img.alt,
          })),
          basePrice: product.basePrice,
          comparePrice: product.comparePrice,
          variants: product.variants.map((v) => ({
            sku: v.sku,
            stock: v.stock,
          })),
        }}
      />
      {/* Breadcrumb */}
      <nav
        aria-label="Đường dẫn"
        className="mb-6 flex flex-wrap items-center gap-1 text-xs text-ink-500"
      >
        <Link href="/" className="hover:text-coral-600">
          Trang chủ
        </Link>
        <span aria-hidden="true">/</span>
        {product.category.parent ? (
          <>
            <Link
              href={`/products?category=${product.category.parent.slug}`}
              className="hover:text-coral-600"
            >
              {product.category.parent.name}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-coral-600"
        >
          {product.category.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-700" aria-current="page">
          {product.name}
        </span>
      </nav>

      {/* Hero — gallery + info */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery
          images={product.images.map((img) => ({
            url: img.url,
            alt: img.alt,
          }))}
          productName={product.name}
        />
        <ProductInfo
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            basePrice: product.basePrice,
            comparePrice: product.comparePrice,
            primaryImageUrl:
              product.images.find((img) => img.isPrimary)?.url ??
              product.images[0]?.url ??
              null,
            category: {
              id: product.category.id,
              name: product.category.name,
              slug: product.category.slug,
              parent: product.category.parent
                ? {
                    id: product.category.parent.id,
                    name: product.category.parent.name,
                    slug: product.category.parent.slug,
                  }
                : null,
            },
            variants: product.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              size: v.size,
              sizeNote: v.sizeNote,
              color: v.color,
              colorHex: v.colorHex,
              price: v.price,
              stock: v.stock,
            })),
          }}
          isLoggedIn={isLoggedIn}
          flashSale={
            flash
              ? { salePrice: flash.salePrice, endsAt: flash.endsAt.toISOString() }
              : undefined
          }
        />
      </div>

      {/* Tabs */}
      <section className="mt-12">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Mô tả chi tiết</TabsTrigger>
            <TabsTrigger value="specs">Thông số</TabsTrigger>
            <TabsTrigger value="reviews">
              Đánh giá{reviewSummary.count > 0 ? ` (${reviewSummary.count})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description">
            {product.description ? (
              <p className="whitespace-pre-wrap text-sm text-ink-700">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-ink-500">Chưa có mô tả chi tiết.</p>
            )}
          </TabsContent>

          <TabsContent value="specs">
            <dl className="grid gap-3 sm:grid-cols-2">
              <SpecRow label="Chất liệu" value={product.material} />
              <SpecRow label="Xuất xứ" value={product.origin} />
              <SpecRow
                label="Hướng dẫn bảo quản"
                value={product.careGuide}
                fullWidth
              />
            </dl>
          </TabsContent>

          <TabsContent value="reviews">
            <ProductReviews
              productId={product.id}
              summary={reviewSummary}
              reviews={reviews}
              isLoggedIn={isLoggedIn}
              myReview={myReview}
              userId={user?.id ?? null}
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* Related products */}
      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            Sản phẩm tương tự
          </h2>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  );
}

function SpecRow({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string | null;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={
        fullWidth
          ? "sm:col-span-2 rounded-xl border border-ink-200 bg-white p-3"
          : "rounded-xl border border-ink-200 bg-white p-3"
      }
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-900">
        {value && value.trim() ? value : "—"}
      </dd>
    </div>
  );
}
