import { create } from "zustand";

import { loadList, saveList } from "@/lib/store-data";

export type Item = {
  id: number;
  name: string;
  stock: number;
  price: number;
  category: string;
};

export type Sale = {
  id: number;
  amount: number;
  date: string;
};

type NewItem = {
  name: string;
  price: number;
  stock: number;
  category: string;
};

type InventoryState = {
  items: Item[];
  sales: Sale[];
  loaded: boolean;

  load: () => Promise<void>;
  reset: () => void;

  addItem: (data: NewItem) => void;
  removeItem: (id: number) => void;
  restock: (id: number, qty: number) => void;
  sell: (id: number, qty: number) => void;
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  sales: [],
  loaded: false,

  // Fetch this account's data from Supabase.
  // Saving is blocked until this finishes, so old data is never overwritten.
  load: async () => {
    set({ loaded: false });
    const [items, sales] = await Promise.all([
      loadList<Item>("items"),
      loadList<Sale>("sales"),
    ]);
    set({ items, sales, loaded: true });
  },

  // Call this on logout so the next account never sees old data.
  reset: () => set({ items: [], sales: [], loaded: false }),

  addItem: (data) => {
    const items = [...get().items, { id: Date.now(), ...data }];
    set({ items });
    if (get().loaded) saveList("items", items);
  },

  removeItem: (id) => {
    const items = get().items.filter((i) => i.id !== id);
    set({ items });
    if (get().loaded) saveList("items", items);
  },

  restock: (id, qty) => {
    const items = get().items.map((i) =>
      i.id === id ? { ...i, stock: i.stock + qty } : i,
    );
    set({ items });
    if (get().loaded) saveList("items", items);
  },

  // Reduces stock AND records the sale, so the Dashboard updates instantly.
  sell: (id, qty) => {
    const target = get().items.find((i) => i.id === id);
    if (!target || qty < 1 || qty > target.stock) return;

    const items = get().items.map((i) =>
      i.id === id ? { ...i, stock: i.stock - qty } : i,
    );
    const sales = [
      ...get().sales,
      {
        id: Date.now(),
        amount: target.price * qty,
        date: new Date().toDateString(),
      },
    ];
    set({ items, sales });

    if (get().loaded) {
      saveList("items", items);
      saveList("sales", sales);
    }
  },
}));
