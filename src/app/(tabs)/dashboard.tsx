import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import AppHeader from "@/components/app-header";
import LoadingScreen from "@/components/loading-screen";
import { Brand, Spacing } from "@/constants/theme";
import { Account, getCurrentAccount } from "@/lib/auth";
import { peso } from "@/lib/format";
import {
    hasShownLoading,
    markLoadingShown,
    withMinimumLoading,
} from "@/lib/loading";
import { useCreditStore } from "@/store/useCreditStore";
import { useInventoryStore } from "@/store/useInventoryStore";

const LOW_STOCK = 8;

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

  if (open === null || close === null) return true;
  if (open === close) return true;

  const current = now.getHours() * 60 + now.getMinutes();

  if (open < close) return current >= open && current < close;
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
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statNote}>{note}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  // Shared state from Zustand: the same data the Inventory and Credit screens change
  const items = useInventoryStore((s) => s.items);
  const sales = useInventoryStore((s) => s.sales);
  const loadStore = useInventoryStore((s) => s.load);
  const customers = useCreditStore((s) => s.customers);
  const loadCredit = useCreditStore((s) => s.load);

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Reload every time this screen opens, so the numbers are always current.
  // The first time, the loading screen stays for at least 5 seconds.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setNow(new Date());

      const work = Promise.all([
        loadStore(),
        loadCredit(),
        getCurrentAccount(),
      ]);
      const request = hasShownLoading("dashboard")
        ? work
        : withMinimumLoading(work);

      request.then((result) => {
        if (!active) return;
        setAccount(result[2]);
        setLoading(false);
        markLoadingShown("dashboard");
      });

      return () => {
        active = false;
      };
    }, [loadStore, loadCredit]),
  );

  // Check the time every 30 seconds so Open / Closed updates on its own
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <LoadingScreen title="Dashboard" message="Loading your store..." />;
  }

  const storeName = account?.storeName || "Your Store";
  const openTime = account?.openTime ?? "6:00 AM";
  const closeTime = account?.closeTime ?? "9:00 PM";
  const storeIsOpen = isStoreOpen(openTime, closeTime, now);

  const today = now.toDateString();
  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Sales today (comes from the inventory store)
  const todaySales = sales.filter((s) => s.date === today);
  const salesToday = todaySales.reduce((sum, s) => sum + s.amount, 0);

  // Utang (comes from the credit store)
  const owing = customers.filter((c) => c.balance > 0);
  const activeUtang = owing.reduce((sum, c) => sum + c.balance, 0);
  const topOwing = [...owing].sort((a, b) => b.balance - a.balance).slice(0, 3);

  // Payments received today (comes from the credit store)
  const paidToday = customers
    .flatMap((c) => c.history ?? [])
    .filter(
      (h) => h.type === "payment" && new Date(h.at).toDateString() === today,
    )
    .reduce((sum, h) => sum + h.amount, 0);

  // Stock (comes from the inventory store)
  const totalUnits = items.reduce((sum, i) => sum + i.stock, 0);
  const stockValue = items.reduce((sum, i) => sum + i.stock * i.price, 0);
  const lowList = items
    .filter((i) => i.stock <= LOW_STOCK)
    .sort((a, b) => a.stock - b.stock);
  const lowShown = lowList.slice(0, 5);

  return (
    <View style={styles.screen}>
      <AppHeader title="Dashboard" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View
              style={[
                styles.statusPill,
                !storeIsOpen && styles.statusPillClosed,
              ]}
            >
              <Text style={styles.statusText}>
                {storeIsOpen ? "Open Now" : "Closed"}
              </Text>
            </View>
            <Text style={styles.bannerDate}>{todayLabel}</Text>
          </View>
          <Text style={styles.bannerTitle}>{storeName}</Text>
          <Text style={styles.bannerSub}>
            {storeIsOpen ? `Closes ${closeTime}` : `Opens ${openTime}`}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Stat
            label="Sales Today"
            value={peso(salesToday)}
            note={
              todaySales.length === 0
                ? "No sales yet"
                : `${todaySales.length} ${todaySales.length === 1 ? "sale" : "sales"}`
            }
          />
          <Stat
            label="Active Utang"
            value={peso(activeUtang)}
            note={
              owing.length === 0
                ? "No customers owe"
                : `${owing.length} ${owing.length === 1 ? "customer" : "customers"}`
            }
          />
        </View>

        <View style={styles.statRow}>
          <Stat
            label="Paid Today"
            value={peso(paidToday)}
            note="Utang payments received"
          />
          <Stat
            label="Stock Value"
            value={peso(stockValue)}
            note={`${items.length} ${items.length === 1 ? "item" : "items"} • ${totalUnits} in stock`}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Low Stock</Text>
            {lowList.length > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{lowList.length}</Text>
              </View>
            ) : null}
          </View>

          {items.length === 0 ? (
            <Text style={styles.emptyText}>
              No products yet. Add your first one in Inventory.
            </Text>
          ) : lowList.length === 0 ? (
            <Text style={styles.okText}>All items are well stocked.</Text>
          ) : (
            <>
              {lowShown.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.row,
                    index < lowShown.length - 1 && styles.rowBorder,
                  ]}
                >
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.rowValue,
                      item.stock === 0 && styles.rowValueOut,
                    ]}
                  >
                    {item.stock === 0 ? "Out of stock" : `${item.stock} left`}
                  </Text>
                </View>
              ))}
              {lowList.length > lowShown.length ? (
                <Text style={styles.moreText}>
                  + {lowList.length - lowShown.length} more
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Who Owes You</Text>

          {topOwing.length === 0 ? (
            <Text style={styles.okText}>Nobody owes you right now.</Text>
          ) : (
            topOwing.map((c, index) => (
              <View
                key={c.id}
                style={[
                  styles.row,
                  index < topOwing.length - 1 && styles.rowBorder,
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {c.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.rowName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.rowValueDanger}>{peso(c.balance)}</Text>
              </View>
            ))
          )}
        </View>
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
  banner: {
    backgroundColor: Brand.primary,
    borderRadius: 20,
    padding: Spacing.four,
  },
  bannerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  statusPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  statusPillClosed: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  statusText: {
    color: Brand.primaryText,
    fontSize: 11,
    fontWeight: "700",
  },
  bannerDate: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  bannerTitle: {
    color: Brand.primaryText,
    fontSize: 24,
    fontWeight: "700",
  },
  bannerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
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
    fontSize: 11,
    color: Brand.textMuted,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Brand.text,
    marginTop: Spacing.one,
  },
  statNote: {
    fontSize: 10,
    color: Brand.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: Brand.card,
    borderRadius: 16,
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Brand.text,
  },
  countBadge: {
    backgroundColor: Brand.dangerBg,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
  },
  countBadgeText: {
    color: Brand.dangerText,
    fontSize: 11,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 12,
    color: Brand.textMuted,
    marginTop: Spacing.two,
  },
  okText: {
    fontSize: 13,
    color: Brand.success,
    fontWeight: "600",
    marginTop: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Brand.text,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.textMuted,
  },
  rowValueOut: {
    color: Brand.dangerText,
  },
  rowValueDanger: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.primary,
  },
  moreText: {
    fontSize: 12,
    color: Brand.textMuted,
    marginTop: Spacing.one,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Brand.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "700",
    color: Brand.primary,
    fontSize: 13,
  },
});
