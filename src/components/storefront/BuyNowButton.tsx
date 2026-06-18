"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useCartStore } from "@/stores/cart-store";
import type {
  AddToCartProduct,
  SelectedVariant,
} from "./AddToCartButton";

export interface BuyNowButtonProps {
  variant: SelectedVariant;
  product: AddToCartProduct;
  quantity: number;
  disabled?: boolean;
  className?: string;
}

export function BuyNowButton({
  variant,
  product,
  quantity,
  disabled,
  className,
}: BuyNowButtonProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  function handleClick() {
    addItem({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.primaryImageUrl,
      size: variant.size,
      sizeNote: variant.sizeNote,
      color: variant.color,
      colorHex: variant.colorHex,
      unitPrice: variant.price ?? product.basePrice,
      maxStock: variant.stock,
      quantity,
    });
    router.push("/checkout");
  }

  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      onClick={handleClick}
      disabled={disabled}
      className={className}
    >
      Mua ngay
    </Button>
  );
}
