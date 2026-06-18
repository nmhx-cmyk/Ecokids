"use client";

import { create } from "zustand";
import { getMyWishlistIds } from "@/lib/server/wishlist";

interface WishlistState {
  ids: Set<string>;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  has: (productId: string) => boolean;
  setActive: (productId: string, active: boolean) => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set<string>(),
  loaded: false,
  loading: false,

  load: async () => {
    const { loaded, loading } = get();
    if (loaded || loading) return;
    set({ loading: true });
    try {
      const ids = await getMyWishlistIds();
      set({ ids: new Set(ids), loaded: true, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  has: (productId) => get().ids.has(productId),

  setActive: (productId, active) => {
    set((state) => {
      const next = new Set(state.ids);
      if (active) next.add(productId);
      else next.delete(productId);
      return { ids: next };
    });
  },
}));
