import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { Brand, Spacing } from "@/constants/theme";
import { getRememberedMobile } from "@/lib/remember";
import { supabase } from "@/lib/supabase";

export default function SplashScreen() {
  useEffect(() => {
    let active = true;

    async function start() {
      const wait = new Promise((resolve) => setTimeout(resolve, 2000));

      let goToApp = false;
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // "Remember this device" was checked: stay logged in.
          // Not checked: end the session so the PIN is asked again.
          const remembered = await getRememberedMobile();
          if (remembered) {
            goToApp = true;
          } else {
            await supabase.auth.signOut();
          }
        }
      } catch {
        goToApp = false;
      }

      await wait;
      if (!active) return;

      router.replace(goToApp ? "/dashboard" : "/login");
    }

    start();
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/icon.png")}
        style={styles.logo}
      />
      <Text style={styles.title}>Sari-sari Store</Text>
      <Text style={styles.subtitle}>Inventory & Customer Credit Ledger</Text>
      <ActivityIndicator
        size="small"
        color={Brand.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 24,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Brand.text,
  },
  subtitle: {
    fontSize: 13,
    color: Brand.textMuted,
    marginTop: Spacing.one,
  },
  spinner: {
    marginTop: Spacing.five,
  },
});
