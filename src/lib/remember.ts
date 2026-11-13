import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "remember_device";
const MOBILE_KEY = "remembered_mobile";

// Save the "Remember this device" choice made at login
export async function setRememberDevice(value: boolean) {
  await AsyncStorage.setItem(KEY, value ? "1" : "0");
}

// Defaults to true when nothing was saved yet
export async function getRememberDevice(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY);
  return value !== "0";
}

// Save the mobile number of the last login
export async function saveRememberedMobile(mobile: string) {
  await AsyncStorage.setItem(MOBILE_KEY, mobile);
}

// Forget the saved number (when "Remember this device" is not ticked)
export async function clearRememberedMobile() {
  await AsyncStorage.removeItem(MOBILE_KEY);
}

// Returns the saved number, or an empty text when there is none
export async function getRememberedMobile(): Promise<string> {
  return (await AsyncStorage.getItem(MOBILE_KEY)) ?? "";
}
