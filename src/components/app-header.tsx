import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand, Spacing } from "@/constants/theme";

type Props = {
  title: string;
  showBack?: boolean;
};

export default function AppHeader({ title, showBack = false }: Props) {
  const insets = useSafeAreaInsets();

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/inventory");
    }
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.left}>
        {showBack && (
          <Pressable onPress={goBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        )}
        <View>
          <Text style={styles.storeLabel}>STORE</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      {!showBack && (
        <Pressable
          onPress={() => router.push("/profile")}
          style={styles.avatar}
        >
          <View style={styles.iconHead} />
          <View style={styles.iconBody} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    backgroundColor: Brand.background,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.card,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 24,
    lineHeight: 26,
    color: Brand.primary,
  },
  storeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Brand.textMuted,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Brand.text,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconHead: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Brand.primaryText,
  },
  iconBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: Brand.primaryText,
  },
});
