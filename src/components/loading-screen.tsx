import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import AppHeader from "@/components/app-header";
import { Brand, Spacing } from "@/constants/theme";

// One loading screen used by every page, so they all look the same
export default function LoadingScreen({
  title,
  message,
  showBack = false,
}: {
  title: string;
  message: string;
  showBack?: boolean;
}) {
  return (
    <View style={styles.screen}>
      <AppHeader title={title} showBack={showBack} />
      <View style={styles.box}>
        <ActivityIndicator size="large" color={Brand.primary} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  box: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
  },
  text: {
    fontSize: 13,
    color: Brand.textMuted,
  },
});
