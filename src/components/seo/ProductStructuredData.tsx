interface ProductImage {
  url: string;
  alt: string;
}

interface ProductVariant {
  sku: string;
  stock: number;
}

interface ProductStructuredDataProps {
  product: {
    name: string;
    slug: string;
    description: string;
    images: ProductImage[];
    basePrice: number;
    comparePrice: number | null;
    variants: ProductVariant[];
  };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// JSON.stringify can emit `</script>` sequences that break out of the inline
// script tag — escape `<` to its unicode form before injecting.
function safeStringify(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function ProductStructuredData({ product }: ProductStructuredDataProps) {
  const inStock = product.variants.some((v) => v.stock > 0);
  const primarySku = product.variants[0]?.sku;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((img) => img.url),
    sku: primarySku,
    url: `${APP_URL}/products/${product.slug}`,
    offers: {
      "@type": "Offer",
      price: product.basePrice,
      priceCurrency: "VND",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${APP_URL}/products/${product.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeStringify(schema) }}
    />
  );
}
