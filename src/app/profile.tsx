import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import AppHeader from "@/components/app-header";
import { Brand, Spacing } from "@/constants/theme";
import { logout } from "@/lib/auth";
import { peso } from "@/lib/format";
import { getProfileData, ProfileData } from "@/lib/profile-stats";

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </View>
  );
}

function InfoRow({
  title,
  subtitle,
  action,
  last = false,
}: {
  title: string;
  subtitle: string;
  action: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Pressable>
        <Text style={styles.rowAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

function formatMobile(mobile: string) {
  return `+63 ${mobile.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}`;
}

export default function ProfileScreen() {
  const [data, setData] = useState<ProfileData | null>(null);

  // Reload every time this screen opens, so numbers are always current
  useFocusEffect(
    useCallback(() => {
      getProfileData().then(setData);
    }, []),
  );

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  const account = data?.account ?? null;
  const storeName = account?.storeName ?? "Your Store";
  const ownerName = account?.ownerName ?? "";
  const mobile = account?.mobile ?? "";
  const address = account?.address ?? "";

  const salesToday = data?.salesToday ?? 0;
  const salesCount = data?.salesCount ?? 0;
  const activeUtang = data?.activeUtang ?? 0;
  const utangCustomers = data?.utangCustomers ?? 0;
  const totalStock = data?.totalStock ?? 0;
  const lowItems = data?.lowItems ?? 0;

  return (
    <View style={styles.screen}>
      <AppHeader title="Profile" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.storeTop}>
            <View style={styles.storeAvatar}>
              <Text style={styles.storeAvatarText}>
                {storeName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{storeName}</Text>
              {ownerName ? <Text style={styles.owner}>{ownerName}</Text> : null}
              <View style={styles.openRow}>
                <View style={styles.openPill}>
                  <Text style={styles.openPillText}>Store Open</Text>
                </View>
                <Text style={styles.closes}>• Closes 9:00 PM</Text>
              </View>
            </View>
          </View>

          <View style={styles.contactBox}>
            {mobile ? (
              <Text style={styles.contactText}>{formatMobile(mobile)}</Text>
            ) : null}
            {address ? <Text style={styles.contactText}>{address}</Text> : null}
          </View>
        </View>

        <View style={styles.statRow}>
          <Stat
            label="Sales Today"
            value={peso(salesToday)}
            note={
              salesCount === 0
                ? "No sales yet"
                : `${salesCount} ${salesCount === 1 ? "sale" : "sales"}`
            }
          />
          <Stat
            label="Active Utang"
            value={peso(activeUtang)}
            note={
              utangCustomers === 0
                ? "No customers owe"
                : `${utangCustomers} ${
                    utangCustomers === 1 ? "customer" : "customers"
                  }`
            }
          />
          <Stat
            label="In Stock"
            value={String(totalStock)}
            note={
              totalStock === 0 && lowItems === 0
                ? "No items yet"
                : `${lowItems} ${lowItems === 1 ? "item" : "items"} low`
            }
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Store Information</Text>
          <InfoRow title="Official Name" subtitle={storeName} action="Edit" />
          <InfoRow
            title="Operating Hours"
            subtitle="6:00 AM - 9:00 PM daily"
            action="Change"
          />
          <InfoRow
            title="GCash QR Code"
            subtitle={mobile ? formatMobile(mobile) : "Not set up"}
            action="View"
            last
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security & Preferences</Text>
          <InfoRow
            title="4-Digit Store PIN"
            subtitle="Required to view debts & cashbox"
            action="Update"
            last
          />
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.footer}>DOM Store • App Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  card: {
    backgroundColor: Brand.card,
    borderRadius: 16,
    padding: Spacing.three,
  },
  storeTop: {
    flexDirection: "row",
    gap: Spacing.three,
  },
  storeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Brand.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  storeAvatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: Brand.primary,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "700",
    color: Brand.text,
  },
  owner: {
    fontSize: 12,
    color: Brand.textMuted,
    marginTop: 2,
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  openPill: {
    backgroundColor: Brand.accentGreen,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  openPillText: {
    color: Brand.accentGreenText,
    fontSize: 11,
    fontWeight: "700",
  },
  closes: {
    fontSize: 11,
    color: Brand.textMuted,
  },
  contactBox: {
    backgroundColor: Brand.inputBg,
    borderRadius: 12,
    padding: Spacing.three,
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  contactText: {
    fontSize: 12,
    color: Brand.text,
  },
  statRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    backgroundColor: Brand.card,
    borderRadius: 14,
    padding: Spacing.three,
  },
  statLabel: {
    fontSize: 10,
    color: Brand.textMuted,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Brand.text,
    marginTop: Spacing.one,
  },
  statNote: {
    fontSize: 10,
    color: Brand.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Brand.text,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  rowText: {
    flex: 1,
    marginRight: Spacing.two,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Brand.text,
  },
  rowSub: {
    fontSize: 11,
    color: Brand.textMuted,
    marginTop: 2,
  },
  rowAction: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.link,
  },
  logoutButton: {
    backgroundColor: Brand.inputBg,
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: Brand.primary,
    fontWeight: "700",
    fontSize: 15,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: Brand.textMuted,
  },
});
