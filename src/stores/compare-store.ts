"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";

export const MAX_COMPARE = 4;

interface CompareState {
  ids: string[];
  toggle: (productId: string, productName?: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],

      toggle: (productId, productName) => {
        const { ids } = get();
        if (ids.includes(productId)) {
          set({ ids: ids.filter((id) => id !== productId) });
          return;
        }
        if (ids.length >= MAX_COMPARE) {
          toast.error(`Chỉ so sánh tối đa ${MAX_COMPARE} sản phẩm`);
          return;
        }
        set({ ids: [...ids, productId] });
        toast.success(
          productName ? `Đã thêm "${productName}" vào so sánh` : "Đã thêm vào so sánh",
        );
      },

      remove: (productId) => {
        set((state) => ({ ids: state.ids.filter((id) => id !== productId) }));
      },

      clear: () => set({ ids: [] }),

      has: (productId) => get().ids.includes(productId),
    }),
    {
      name: "ecokids-compare",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
