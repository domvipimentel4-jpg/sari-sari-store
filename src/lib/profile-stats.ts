import { Account, getCurrentAccount } from "@/lib/auth";
import { loadList } from "@/lib/store-data";

const LOW_STOCK = 8; // same as inventory.tsx

export type ProfileData = {
  account: Account | null;
  salesToday: number;
  salesCount: number;
  activeUtang: number;
  utangCustomers: number;
  totalStock: number;
  lowItems: number;
};

export async function getProfileData(): Promise<ProfileData> {
  const account = await getCurrentAccount();

  const items = await loadList<{ stock: number }>("items");
  const customers = await loadList<{ balance: number }>("customers");
  const sales = await loadList<{ amount: number; date: string }>("sales");

  const today = new Date().toDateString();
  const todaySales = sales.filter((s) => s.date === today);
  const owing = customers.filter((c) => c.balance > 0);

  return {
    account,
    salesToday: todaySales.reduce((sum, s) => sum + s.amount, 0),
    salesCount: todaySales.length,
    activeUtang: owing.reduce((sum, c) => sum + c.balance, 0),
    utangCustomers: owing.length,
    totalStock: items.reduce((sum, i) => sum + i.stock, 0),
    lowItems: items.filter((i) => i.stock <= LOW_STOCK).length,
  };
}
