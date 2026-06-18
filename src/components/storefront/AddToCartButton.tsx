"use client";

import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useCartStore } from "@/stores/cart-store";

export interface SelectedVariant {
  id: string;
  sku: string;
  size: string;
  sizeNote: string | null;
  color: string;
  colorHex: string | null;
  price: number | null;
  stock: number;
}

export interface AddToCartProduct {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  primaryImageUrl: string | null;
}

export interface AddToCartButtonProps {
  variant: SelectedVariant;
  product: AddToCartProduct;
  quantity: number;
  isLoggedIn: boolean;
  disabled?: boolean;
  className?: string;
}

export function AddToCartButton({
  variant,
  product,
  quantity,
  isLoggedIn,
  disabled,
  className,
}: AddToCartButtonProps) {
  const pathname = usePathname();
  const addItem = useCartStore((s) => s.addItem);
  const setMiniOpen = useCartStore((s) => s.setMiniOpen);

  function handleClick() {
    if (!isLoggedIn) {
      const redirectTo = encodeURIComponent(pathname ?? "/");
      toast("Vui lòng đăng nhập để mua hàng", {
        description: "Bạn cần đăng nhập để thêm sản phẩm vào giỏ.",
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
    setMiniOpen(true);
  }

  return (
    <Button
      type="button"
      size="lg"
      onClick={handleClick}
      disabled={disabled}
      className={className}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      Thêm vào giỏ
    </Button>
  );
}
