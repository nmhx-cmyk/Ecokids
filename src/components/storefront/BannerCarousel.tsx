import Image from "next/image";
import Link from "next/link";
import type { ActiveBanner } from "@/lib/queries/banners";

interface BannerCarouselProps {
  banners: ActiveBanner[];
}

function BannerSlide({ banner, priority }: { banner: ActiveBanner; priority: boolean }) {
  const content = (
    <div className="relative aspect-[16/6] w-full overflow-hidden rounded-2xl bg-cream-100">
      <Image
        src={banner.imageUrl}
        alt={banner.title}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 80vw, 100vw"
        className="object-cover"
      />
    </div>
  );

  if (banner.linkUrl) {
    return (
      <Link
        href={banner.linkUrl}
        className="block shrink-0 basis-full snap-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
        aria-label={banner.title}
      >
        {content}
      </Link>
    );
  }
  return <div className="shrink-0 basis-full snap-center">{content}</div>;
}

/** Homepage banners. Single banner renders full-width; multiple become a
 * scroll-snap carousel (no JS needed). */
export function BannerCarousel({ banners }: BannerCarouselProps) {
  if (banners.length === 0) return null;

  if (banners.length === 1) {
    return (
      <section className="mx-4 mt-4 lg:mx-8 lg:mt-8">
        <BannerSlide banner={banners[0]!} priority />
      </section>
    );
  }

  return (
    <section
      className="mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 lg:mx-8 lg:mt-8"
      aria-label="Banner khuyến mãi"
    >
      {banners.map((banner, i) => (
        <BannerSlide key={banner.id} banner={banner} priority={i === 0} />
      ))}
    </section>
  );
}
