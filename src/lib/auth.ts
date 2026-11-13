import { useCreditStore } from "@/store/useCreditStore";
import { useInventoryStore } from "@/store/useInventoryStore";

import { supabase } from "./supabase";

export type Account = {
  storeName: string;
  mobile: string;
  ownerName?: string;
  address?: string;
  openTime?: string;
  closeTime?: string;
};

// Supabase needs an email and a password of at least 6 characters.
// We build both from the mobile number and PIN, so the user only types those.
function toEmail(mobile: string) {
  return `${mobile}@sarisari-store.com`;
}

function toPassword(pin: string) {
  return `${pin}-sari`;
}

// Clears the Zustand stores so one account never sees another account's data
function resetStores() {
  useInventoryStore.getState().reset();
  useCreditStore.getState().reset();
}

export async function registerStore(account: Account & { pin: string }) {
  const { error } = await supabase.auth.signUp({
    email: toEmail(account.mobile),
    password: toPassword(account.pin),
    options: {
      data: {
        store_name: account.storeName,
        mobile: account.mobile,
        owner_name: account.ownerName ?? "",
        address: account.address ?? "",
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return {
        ok: false,
        message: "This mobile number is already registered.",
      };
    }
    return { ok: false, message: error.message };
  }

  // Sign up also logs the user in, so log out and let them log in themselves
  await supabase.auth.signOut();
  return { ok: true, message: "" };
}

export async function login(mobile: string, pin: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: toEmail(mobile),
    password: toPassword(pin),
  });

  // Clear any data left in memory from a previous account
  if (!error) resetStores();

  return !error;
}

export async function logout() {
  // Clear the stores first so the next account never sees old data
  resetStores();
  await supabase.auth.signOut();
}

export async function getCurrentAccount(): Promise<Account | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  return {
    storeName: (meta.store_name as string) ?? "",
    mobile: (meta.mobile as string) ?? user.email?.split("@")[0] ?? "",
    ownerName: (meta.owner_name as string) ?? "",
    address: (meta.address as string) ?? "",
    openTime: (meta.open_time as string) ?? "6:00 AM",
    closeTime: (meta.close_time as string) ?? "9:00 PM",
  };
}

// Change the store name, owner name, address and/or operating hours
export async function updateAccount(fields: {
  storeName?: string;
  ownerName?: string;
  address?: string;
  openTime?: string;
  closeTime?: string;
}) {
  const data: Record<string, string> = {};
  if (fields.storeName !== undefined) data.store_name = fields.storeName;
  if (fields.ownerName !== undefined) data.owner_name = fields.ownerName;
  if (fields.address !== undefined) data.address = fields.address;
  if (fields.openTime !== undefined) data.open_time = fields.openTime;
  if (fields.closeTime !== undefined) data.close_time = fields.closeTime;

  const { error } = await supabase.auth.updateUser({ data });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "" };
}

// Change the 4-digit PIN (the current PIN must be correct)
export async function changePin(currentPin: string, newPin: string) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false, message: "You are not logged in." };

  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: toEmail(account.mobile),
    password: toPassword(currentPin),
  });
  if (checkError) return { ok: false, message: "Current PIN is wrong." };

  const { error } = await supabase.auth.updateUser({
    password: toPassword(newPin),
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "" };
}
