"use client";

import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
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
  isLoggedIn: boolean;
  disabled?: boolean;
  className?: string;
}

export function BuyNowButton({
  variant,
  product,
  quantity,
  isLoggedIn,
  disabled,
  className,
}: BuyNowButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const addItem = useCartStore((s) => s.addItem);

  function handleClick() {
    if (!isLoggedIn) {
      const redirectTo = encodeURIComponent(pathname ?? "/");
      toast("Vui lòng đăng nhập để mua hàng", {
        description: "Bạn cần đăng nhập để tiếp tục đặt hàng.",
        duration: 2000,
        action: {
          label: "Đăng nhập ngay",
          onClick: () => {
            window.location.href = `/login?redirectTo=${redirectTo}`;
          },
        },
      });
      return;
    }

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
