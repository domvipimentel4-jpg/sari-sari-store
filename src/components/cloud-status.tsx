import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Brand, Spacing } from "@/constants/theme";

type Status = "checking" | "online" | "offline";

export default function CloudStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(`${url}/auth/v1/health`, {
          headers: { apikey: key ?? "" },
        });
        if (active) setStatus(response.ok ? "online" : "offline");
      } catch {
        if (active) setStatus("offline");
      }
    }

    check();
    // Check again every 15 seconds
    const timer = setInterval(check, 15000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const label =
    status === "checking"
      ? "Checking cloud..."
      : status === "online"
        ? "Supabase connected"
        : "Cloud offline";

  const dotColor =
    status === "online"
      ? Brand.success
      : status === "offline"
        ? Brand.dangerText
        : Brand.textMuted;

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    color: Brand.textMuted,
  },
});
