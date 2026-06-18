"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} from "@/lib/constants/shipping";

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  size: string;
  sizeNote: string | null;
  color: string;
  colorHex: string | null;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

export type AddItemInput = Omit<CartItem, "quantity"> & { quantity?: number };

interface CartState {
  items: CartItem[];
  isMiniOpen: boolean;
  addItem: (item: AddItemInput) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setMiniOpen: (open: boolean) => void;
  hydrate: () => void;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isMiniOpen: false,

      addItem: (input) => {
        const requested = input.quantity ?? 1;
        set((state) => {
          const existing = state.items.find(
            (it) => it.variantId === input.variantId,
          );
          if (existing) {
            const nextQty = clamp(
              existing.quantity + requested,
              1,
              input.maxStock,
            );
            const items = state.items.map((it) =>
              it.variantId === input.variantId
                ? {
                    ...it,
                    quantity: nextQty,
                    // Refresh meta in case price/stock changed since first add.
                    unitPrice: input.unitPrice,
                    maxStock: input.maxStock,
                    productImage: input.productImage,
                  }
                : it,
            );
            return { items };
          }

          const newItem: CartItem = {
            variantId: input.variantId,
            productId: input.productId,
            productName: input.productName,
            productSlug: input.productSlug,
            productImage: input.productImage,
            size: input.size,
            sizeNote: input.sizeNote,
            color: input.color,
            colorHex: input.colorHex,
            unitPrice: input.unitPrice,
            maxStock: input.maxStock,
            quantity: clamp(requested, 1, input.maxStock),
          };
          return { items: [...state.items, newItem] };
        });
        toast.success("Đã thêm vào giỏ hàng");
      },

      updateQuantity: (variantId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((it) => it.variantId !== variantId),
            };
          }
          const items = state.items.map((it) =>
            it.variantId === variantId
              ? { ...it, quantity: clamp(quantity, 1, it.maxStock) }
              : it,
          );
          return { items };
        });
      },

      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((it) => it.variantId !== variantId),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      setMiniOpen: (open) => {
        set({ isMiniOpen: open });
      },

      // Placeholder for future SSR-aware hydration logic.
      hydrate: () => {},
    }),
    {
      name: "ecokids-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

// ============================================
// Selectors (pure functions over state)
// ============================================

export function selectTotalItems(state: CartState): number {
  return state.items.reduce((sum, it) => sum + it.quantity, 0);
}

export function selectSubtotal(state: CartState): number {
  return state.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
}

export function selectShippingFee(_state: CartState, subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
}

export function selectTotal(state: CartState): number {
  const subtotal = selectSubtotal(state);
  return subtotal + selectShippingFee(state, subtotal);
}
