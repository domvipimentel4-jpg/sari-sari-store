import AsyncStorage from "@react-native-async-storage/async-storage";

// Each store's data is saved under its own mobile number
async function keyFor(name: string) {
  const mobile = (await AsyncStorage.getItem("session")) ?? "guest";
  return `${name}:${mobile}`;
}

export async function loadList<T>(name: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(await keyFor(name));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export async function saveList<T>(name: string, list: T[]) {
  await AsyncStorage.setItem(await keyFor(name), JSON.stringify(list));
}
