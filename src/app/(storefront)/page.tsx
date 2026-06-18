import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, Undo2 } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import {
  getBestSellers,
  getFeaturedCategories,
  getNewArrivals,
} from "@/lib/queries/storefront";

export default async function HomePage() {
  const [featuredCategories, bestSellers, newArrivals] = await Promise.all([
    getFeaturedCategories(4),
    getBestSellers(8),
    getNewArrivals(8),
  ]);

  return (
    <>
      {/* Section 1 — Hero */}
      <section className="mx-4 mt-4 rounded-3xl bg-cream-100 px-6 py-10 sm:px-10 lg:mx-8 lg:mt-8 lg:px-16 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="max-w-md">
            <Badge variant="coral">Bộ sưu tập 2026</Badge>
            <h1 className="mt-4 font-display text-display-mobile text-ink-900 sm:text-display-tablet lg:text-display-desktop">
              Thời trang trẻ em an toàn, dễ thương cho mọi ngày
            </h1>
            <p className="mt-4 text-base text-ink-700">
              Tìm cho bé yêu những bộ trang phục thoải mái nhất, từ sơ sinh đến
              12 tuổi.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/products">
                  Khám phá ngay
                  <ArrowRight
                    className="h-4 w-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/guide">Xem hướng dẫn chọn size</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl lg:aspect-[4/3]">
            <Image
              src="https://picsum.photos/seed/ecokids-hero/900/720.webp"
              alt="Ảnh trẻ em với trang phục Ecokids"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 92vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section 2 — Featured Categories */}
      <section className="container py-12 lg:py-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          Khám phá theo danh mục
        </h2>
        {featuredCategories.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featuredCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group relative aspect-square overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
              >
                {cat.imageUrl ? (
                  <Image
                    src={cat.imageUrl}
                    alt={cat.name}
                    fill
                    sizes="(min-width: 1024px) 22vw, 48vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-full w-full bg-gradient-to-br from-coral-500 to-mint-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/20 to-transparent" />
                <div className="absolute inset-0 flex items-end justify-center p-4">
                  <span className="text-center text-base font-semibold text-white sm:text-lg">
                    {cat.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-ink-500">
            Danh mục sẽ sớm được cập nhật.
          </p>
        )}
      </section>

      {/* Section 3 — Best Sellers */}
      <section className="bg-cream-50 py-12">
        <div className="container">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
                Sản phẩm bán chạy
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Được khách hàng yêu thích
              </p>
            </div>
            <Link
              href="/products"
              className="text-sm font-medium text-coral-600 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
            >
              Xem tất cả →
            </Link>
          </header>
          <ProductGrid
            products={bestSellers}
            emptyTitle="Sắp có sản phẩm bán chạy"
            emptyDescription="Hãy quay lại sau để khám phá những lựa chọn được yêu thích nhất."
          />
        </div>
      </section>

      {/* Section 4 — Sale Banner */}
      <section className="container my-12">
        <div className="grid items-center gap-6 rounded-3xl bg-coral-600 px-6 py-8 text-white lg:grid-cols-2 lg:px-12 lg:py-12">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Ưu đãi đặc biệt
            </h2>
            <p className="mt-2 text-base text-white/90">
              Giảm đến 30% các sản phẩm chọn lọc
            </p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="mt-6 border-white bg-transparent text-white hover:bg-white hover:text-coral-600"
            >
              <Link href="/products?onSale=true">Xem ngay</Link>
            </Button>
          </div>
          <div
            aria-hidden="true"
            className="flex items-center justify-center lg:justify-end"
          >
            <span className="font-display text-[120px] font-bold leading-none text-white/90 sm:text-[160px] lg:text-[200px]">
              30%
            </span>
          </div>
        </div>
      </section>

      {/* Section 5 — New Arrivals */}
      <section className="container py-12">
        <header className="mb-8">
          <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            Mới về
          </h2>
        </header>
        <ProductGrid
          products={newArrivals}
          emptyTitle="Chưa có sản phẩm mới"
          emptyDescription="Bộ sưu tập mới đang được chuẩn bị, hãy quay lại sau."
        />
      </section>

      {/* Section 6 — Trust badges / USPs */}
      <section className="bg-mint-50 py-12 lg:bg-transparent lg:py-16">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-3">
            <TrustItem
              icon={<ShieldCheck className="h-8 w-8" strokeWidth={1.5} />}
              title="An toàn 100%"
              description="Chất liệu cotton organic"
            />
            <TrustItem
              icon={<Truck className="h-8 w-8" strokeWidth={1.5} />}
              title="Giao hàng nhanh"
              description="Toàn quốc 2-4 ngày"
            />
            <TrustItem
              icon={<Undo2 className="h-8 w-8" strokeWidth={1.5} />}
              title="Đổi trả dễ dàng"
              description="Trong vòng 7 ngày"
            />
          </div>
        </div>
      </section>
    </>
  );
}

function TrustItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center lg:flex-row lg:text-left">
      <div className="text-coral-600" aria-hidden="true">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        <p className="text-sm text-ink-700">{description}</p>
      </div>
    </div>
  );
}
