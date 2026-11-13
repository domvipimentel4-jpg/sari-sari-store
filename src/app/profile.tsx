import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import AppHeader from "@/components/app-header";
import EditModal, { ModalField } from "@/components/edit-modal";
import LoadingScreen from "@/components/loading-screen";
import { Brand, Spacing } from "@/constants/theme";
import { changePin, logout, updateAccount } from "@/lib/auth";
import { peso } from "@/lib/format";
import {
  hasShownLoading,
  markLoadingShown,
  resetLoadingShown,
  withMinimumLoading,
} from "@/lib/loading";
import { getProfileData, ProfileData } from "@/lib/profile-stats";

type EditKind = "name" | "owner" | "address" | "hours" | "pin" | null;

// Remembers the last loaded data, so the screen opens instantly next time
let cachedData: ProfileData | null = null;

async function loadProfile(): Promise<ProfileData> {
  const result = await getProfileData();
  cachedData = result;
  return result;
}

// Turns a time like "6:00 AM" into minutes since midnight (360).
// Returns null if the text can't be read.
function toMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  if (hour < 1 || hour > 12 || minute > 59) return null;

  const isPm = match[3].toLowerCase() === "pm";
  if (hour === 12) hour = 0;
  if (isPm) hour += 12;

  return hour * 60 + minute;
}

// True when the current time is between opening and closing time
function isStoreOpen(openTime: string, closeTime: string, now: Date): boolean {
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);

  // If the times can't be read, don't claim the store is closed
  if (open === null || close === null) return true;
  // Same time for both means open all day
  if (open === close) return true;

  const current = now.getHours() * 60 + now.getMinutes();

  // Normal day, for example 6:00 AM to 9:00 PM
  if (open < close) return current >= open && current < close;
  // Open past midnight, for example 6:00 PM to 2:00 AM
  return current >= open || current < close;
}

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
  onPress,
  last = false,
}: {
  title: string;
  subtitle: string;
  action: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Pressable onPress={onPress}>
        <Text style={styles.rowAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

function formatMobile(mobile: string) {
  return `+63 ${mobile.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}`;
}

export default function ProfileScreen() {
  const [data, setData] = useState<ProfileData | null>(cachedData);
  const [ready, setReady] = useState(() => hasShownLoading("profile"));
  const [editing, setEditing] = useState<EditKind>(null);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(new Date());

  function reload() {
    loadProfile().then(setData);
  }

  // Reload every time this screen opens, so numbers are always current.
  // The first time, the loading screen stays for at least 5 seconds.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setNow(new Date());

      const work = loadProfile();
      const request = hasShownLoading("profile")
        ? work
        : withMinimumLoading(work);

      request.then((result) => {
        if (!active) return;
        setData(result);
        markLoadingShown("profile");
        setReady(true);
      });

      return () => {
        active = false;
      };
    }, []),
  );

  // Check the time every 30 seconds so Open / Closed updates on its own
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }

  async function handleLogout() {
    await logout();
    cachedData = null; // forget the old store's data
    resetLoadingShown(); // the next account sees the loading screens again
    router.replace("/login");
  }

  // Show a loading screen until the real data arrives
  if (!data || !ready) {
    return (
      <LoadingScreen title="Profile" message="Loading profile..." showBack />
    );
  }

  const account = data.account;
  const storeName = account?.storeName ?? "Your Store";
  const ownerName = account?.ownerName ?? "";
  const mobile = account?.mobile ?? "";
  const address = account?.address ?? "";
  const openTime = account?.openTime ?? "6:00 AM";
  const closeTime = account?.closeTime ?? "9:00 PM";

  const storeIsOpen = isStoreOpen(openTime, closeTime, now);

  const salesToday = data.salesToday;
  const salesCount = data.salesCount;
  const activeUtang = data.activeUtang;
  const utangCustomers = data.utangCustomers;
  const totalStock = data.totalStock;
  const lowItems = data.lowItems;

  // What the popup shows for each button
  let modalTitle = "";
  let modalFields: ModalField[] = [];

  if (editing === "name") {
    modalTitle = "Edit Store Name";
    modalFields = [
      {
        key: "storeName",
        label: "Store Name",
        initial: storeName,
        placeholder: "e.g. Aling Nena's Store",
      },
    ];
  } else if (editing === "owner") {
    modalTitle = "Edit Owner Full Name";
    modalFields = [
      {
        key: "ownerName",
        label: "Owner Full Name",
        initial: ownerName,
        placeholder: "e.g. Maria Santos",
      },
    ];
  } else if (editing === "address") {
    modalTitle = "Edit Store Address";
    modalFields = [
      {
        key: "address",
        label: "Store Address",
        initial: address,
        placeholder: "e.g. Brgy. San Antonio, Pasig City",
      },
    ];
  } else if (editing === "hours") {
    modalTitle = "Change Operating Hours";
    modalFields = [
      {
        key: "openTime",
        label: "Opening Time",
        initial: openTime,
        placeholder: "e.g. 6:00 AM",
      },
      {
        key: "closeTime",
        label: "Closing Time",
        initial: closeTime,
        placeholder: "e.g. 9:00 PM",
      },
    ];
  } else if (editing === "pin") {
    modalTitle = "Update Store PIN";
    modalFields = [
      {
        key: "currentPin",
        label: "Current PIN",
        placeholder: "••••",
        secure: true,
        digitsOnly: true,
        maxLength: 4,
      },
      {
        key: "newPin",
        label: "New 4-Digit PIN",
        placeholder: "••••",
        secure: true,
        digitsOnly: true,
        maxLength: 4,
      },
      {
        key: "confirmPin",
        label: "Confirm New PIN",
        placeholder: "••••",
        secure: true,
        digitsOnly: true,
        maxLength: 4,
      },
    ];
  }

  // Returns an error message to show in the popup, or null when it worked
  async function handleSave(
    values: Record<string, string>,
  ): Promise<string | null> {
    if (editing === "name") {
      const name = values.storeName.trim();
      if (!name) return "Enter a store name.";

      const result = await updateAccount({ storeName: name });
      if (!result.ok) return result.message;
      showNotice("Store name updated.");
    } else if (editing === "owner") {
      const owner = values.ownerName.trim();
      if (!owner) return "Enter the owner's full name.";

      const result = await updateAccount({ ownerName: owner });
      if (!result.ok) return result.message;
      showNotice("Owner name updated.");
    } else if (editing === "address") {
      const newAddress = values.address.trim();
      if (!newAddress) return "Enter your store address.";

      const result = await updateAccount({ address: newAddress });
      if (!result.ok) return result.message;
      showNotice("Store address updated.");
    } else if (editing === "hours") {
      const open = values.openTime.trim();
      const close = values.closeTime.trim();
      if (!open || !close) return "Enter both the opening and closing time.";
      if (toMinutes(open) === null || toMinutes(close) === null)
        return "Use a time like 6:00 AM or 9:30 PM.";

      const result = await updateAccount({ openTime: open, closeTime: close });
      if (!result.ok) return result.message;
      showNotice("Operating hours updated.");
    } else if (editing === "pin") {
      if (values.currentPin.length !== 4)
        return "Current PIN must be 4 digits.";
      if (values.newPin.length !== 4) return "New PIN must be 4 digits.";
      if (values.newPin !== values.confirmPin) return "New PINs do not match.";

      const result = await changePin(values.currentPin, values.newPin);
      if (!result.ok) return result.message;
      showNotice("PIN updated. Use the new PIN next time you log in.");
    }

    setEditing(null);
    reload();
    return null;
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Profile" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

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
                <View
                  style={[styles.openPill, !storeIsOpen && styles.closedPill]}
                >
                  <Text
                    style={[
                      styles.openPillText,
                      !storeIsOpen && styles.closedPillText,
                    ]}
                  >
                    {storeIsOpen ? "Store Open" : "Store Closed"}
                  </Text>
                </View>
                <Text style={styles.closes}>
                  {storeIsOpen
                    ? `• Closes ${closeTime}`
                    : `• Opens ${openTime}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.contactBox}>
            {mobile ? (
              <Text style={styles.contactText}>{formatMobile(mobile)}</Text>
            ) : null}
            <Pressable onPress={() => setEditing("owner")}>
              <Text
                style={ownerName ? styles.contactText : styles.contactEmpty}
              >
                {ownerName || "Add owner name"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setEditing("address")}>
              <Text style={address ? styles.contactText : styles.contactEmpty}>
                {address || "Add store address"}
              </Text>
            </Pressable>
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
          <InfoRow
            title="Official Name"
            subtitle={storeName}
            action="Edit"
            onPress={() => setEditing("name")}
          />
          <InfoRow
            title="Owner Full Name"
            subtitle={ownerName || "Not set"}
            action={ownerName ? "Edit" : "Add"}
            onPress={() => setEditing("owner")}
          />
          <InfoRow
            title="Store Address"
            subtitle={address || "Not set"}
            action={address ? "Edit" : "Add"}
            onPress={() => setEditing("address")}
          />
          <InfoRow
            title="Operating Hours"
            subtitle={`${openTime} - ${closeTime} daily`}
            action="Change"
            onPress={() => setEditing("hours")}
            last
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security & Preferences</Text>
          <InfoRow
            title="4-Digit Store PIN"
            subtitle="Required to view debts & cashbox"
            action="Update"
            onPress={() => setEditing("pin")}
            last
          />
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.footer}>{storeName} • App Version 1.0.0</Text>
      </ScrollView>

      <EditModal
        visible={editing !== null}
        title={modalTitle}
        fields={modalFields}
        onCancel={() => setEditing(null)}
        onSave={handleSave}
      />
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
  notice: {
    color: Brand.success,
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
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
  closedPill: {
    backgroundColor: Brand.dangerBg,
  },
  openPillText: {
    color: Brand.accentGreenText,
    fontSize: 11,
    fontWeight: "700",
  },
  closedPillText: {
    color: Brand.dangerText,
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
  contactEmpty: {
    fontSize: 12,
    color: Brand.textMuted,
    fontStyle: "italic",
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
