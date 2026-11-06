import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCOUNTS_KEY = "accounts";
const SESSION_KEY = "session";

export type Account = {
  storeName: string;
  ownerName: string;
  mobile: string;
  address: string;
  pin: string;
};

async function getAccounts(): Promise<Account[]> {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function registerStore(account: Account) {
  const accounts = await getAccounts();

  if (accounts.some((a) => a.mobile === account.mobile)) {
    return { ok: false, message: "This mobile number is already registered." };
  }

  await AsyncStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify([...accounts, account]),
  );
  return { ok: true, message: "" };
}

export async function login(mobile: string, pin: string) {
  const accounts = await getAccounts();
  const found = accounts.find((a) => a.mobile === mobile && a.pin === pin);

  if (!found) return false;

  await AsyncStorage.setItem(SESSION_KEY, mobile);
  return true;
}

export async function getCurrentAccount(): Promise<Account | null> {
  const mobile = await AsyncStorage.getItem(SESSION_KEY);
  if (!mobile) return null;

  const accounts = await getAccounts();
  return accounts.find((a) => a.mobile === mobile) ?? null;
}

export async function logout() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
