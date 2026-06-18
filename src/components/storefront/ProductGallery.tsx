"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export interface ProductGalleryImage {
  url: string;
  alt: string;
}

export interface ProductGalleryProps {
  images: ReadonlyArray<ProductGalleryImage>;
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const thumbRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream-100">
        <div
          className="flex h-full w-full items-center justify-center font-display text-7xl font-bold text-coral-500"
          aria-hidden="true"
        >
          {productName.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, images.length - 1);
  const activeImage = images[safeIndex] ?? images[0];
  if (!activeImage) {
    // Defensive: should never hit because of the empty-check above.
    return null;
  }

  function handleThumbKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight"
        ? (safeIndex + 1) % images.length
        : (safeIndex - 1 + images.length) % images.length;
    setActiveIndex(next);
    thumbRefs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop / tablet main image */}
      <div className="relative hidden aspect-[4/5] overflow-hidden rounded-2xl bg-cream-100 sm:block">
        <Image
          key={activeImage.url}
          src={activeImage.url}
          alt={activeImage.alt || productName}
          fill
          priority
          sizes="(min-width: 1024px) 45vw, 90vw"
          className="object-cover"
        />
      </div>

      {/* Mobile scroll-snap carousel */}
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:hidden"
        aria-label={`Ảnh sản phẩm ${productName}`}
      >
        {images.map((img, i) => (
          <div
            key={img.url + i}
            className="relative aspect-[4/5] w-full flex-shrink-0 snap-start overflow-hidden rounded-2xl bg-cream-100"
          >
            <Image
              src={img.url}
              alt={img.alt || productName}
              fill
              priority={i === 0}
              sizes="90vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Thumbnails (desktop only) */}
      {images.length > 1 ? (
        <div
          className="hidden gap-2 overflow-x-auto sm:flex"
          role="tablist"
          aria-label="Thư viện ảnh"
        >
          {images.map((img, i) => (
            <button
              key={img.url + i}
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Xem ảnh ${i + 1}`}
              onClick={() => setActiveIndex(i)}
              onKeyDown={handleThumbKeyDown}
              className={cn(
                "relative aspect-square w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-cream-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
                i === safeIndex
                  ? "border-coral-500"
                  : "border-transparent hover:border-ink-200",
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
