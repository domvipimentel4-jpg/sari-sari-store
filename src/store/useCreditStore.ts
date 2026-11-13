import { create } from "zustand";

import { Brand } from "@/constants/theme";
import { loadList, saveList } from "@/lib/store-data";

export type HistoryEntry = {
  id: number;
  type: "utang" | "payment";
  amount: number;
  at: string; // ISO date
  note?: string;
};

export type Customer = {
  id: number;
  name: string;
  last: string;
  tag: string;
  balance: number;
  avatarBg: string;
  tagBg: string;
  tagText: string;
  history?: HistoryEntry[]; // older customers don't have this yet
};

type CreditState = {
  customers: Customer[];
  loaded: boolean;

  load: () => Promise<void>;
  reset: () => void;

  addCustomer: (name: string, balance: number) => void;
  removeCustomer: (id: number) => void;
  recordPayment: (id: number, amount: number) => void;
  addUtang: (id: number, amount: number, note?: string) => void;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export const useCreditStore = create<CreditState>((set, get) => {
  // Update the store, then save to Supabase (only after the data has loaded)
  const commit = (customers: Customer[]) => {
    set({ customers });
    if (get().loaded) saveList("customers", customers);
  };

  return {
    customers: [],
    loaded: false,

    // Fetch this account's customers from Supabase.
    // Saving is blocked until this finishes, so old data is never overwritten.
    load: async () => {
      set({ loaded: false });
      const customers = await loadList<Customer>("customers");
      set({ customers, loaded: true });
    },

    // Call this on login/logout so the next account never sees old data.
    reset: () => set({ customers: [], loaded: false }),

    addCustomer: (name, balance) => {
      const now = new Date().toISOString();
      const history: HistoryEntry[] =
        balance > 0
          ? [
              {
                id: Date.now(),
                type: "utang",
                amount: balance,
                at: now,
                note: "Starting balance",
              },
            ]
          : [];

      commit([
        ...get().customers,
        {
          id: Date.now(),
          name,
          last: "Added today",
          tag: "New",
          balance,
          avatarBg: "#F9D5D3",
          tagBg: Brand.badgeBg,
          tagText: Brand.badgeText,
          history,
        },
      ]);
    },

    removeCustomer: (id) => {
      commit(get().customers.filter((c) => c.id !== id));
    },

    recordPayment: (id, amount) => {
      const target = get().customers.find((c) => c.id === id);
      const paid = round2(amount);
      if (!target || paid <= 0 || paid > target.balance) return;

      const now = new Date().toISOString();
      const entry: HistoryEntry = {
        id: Date.now(),
        type: "payment",
        amount: paid,
        at: now,
      };

      commit(
        get().customers.map((c) =>
          c.id === id
            ? {
                ...c,
                balance: round2(c.balance - paid),
                last: `Last paid ${shortDate(now)}`,
                history: [...(c.history ?? []), entry],
              }
            : c,
        ),
      );
    },

    addUtang: (id, amount, note) => {
      const target = get().customers.find((c) => c.id === id);
      const added = round2(amount);
      if (!target || added <= 0) return;

      const now = new Date().toISOString();
      const entry: HistoryEntry = {
        id: Date.now(),
        type: "utang",
        amount: added,
        at: now,
        note: note || undefined,
      };

      commit(
        get().customers.map((c) =>
          c.id === id
            ? {
                ...c,
                balance: round2(c.balance + added),
                last: `Last utang ${shortDate(now)}`,
                history: [...(c.history ?? []), entry],
              }
            : c,
        ),
      );
    },
  };
});
