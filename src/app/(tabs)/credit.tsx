import { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import AddModal from "@/components/add-modal";
import AppHeader from "@/components/app-header";
import { Brand, Spacing } from "@/constants/theme";
import { peso } from "@/lib/format";
import { loadList, saveList } from "@/lib/store-data";

type Customer = {
  id: number;
  name: string;
  last: string;
  tag: string;
  balance: number;
  avatarBg: string;
  tagBg: string;
  tagText: string;
};

export default function CreditScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [paidToday, setPaidToday] = useState(0);
  const [search, setSearch] = useState("");

  // Load saved customers when the screen opens
  useEffect(() => {
    loadList<Customer>("customers").then((list) => {
      setCustomers(list);
      setLoaded(true);
    });
  }, []);

  // Save every time customers change
  useEffect(() => {
    if (loaded) saveList("customers", customers);
  }, [customers, loaded]);

  async function addCustomer(v: Record<string, string>) {
    const balance = parseFloat(v.balance || "0");

    if (!v.name?.trim()) return "Enter the customer's name.";
    if (isNaN(balance) || balance < 0) return "Enter a valid balance.";

    setCustomers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: v.name.trim(),
        last: "Added today",
        tag: "New",
        balance,
        avatarBg: "#F9D5D3",
        tagBg: Brand.badgeBg,
        tagText: Brand.badgeText,
      },
    ]);
    return null;
  }

  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const total = customers.reduce((sum, c) => sum + c.balance, 0);

  const shown = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  function markReceived(id: number) {
    const person = customers.find((c) => c.id === id);
    if (!person || person.balance === 0) return;

    setPaidToday(paidToday + person.balance);
    setCustomers(
      customers.map((c) => (c.id === id ? { ...c, balance: 0 } : c)),
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Credit Ledger" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>CUSTOMER CREDIT LEDGER</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{month}</Text>
            </View>
          </View>

          <Text style={styles.bannerTitle}>Credit Ledger</Text>
          <Text style={styles.bannerSub}>
            Customer credit • Total: {peso(total)} • {customers.length}{" "}
            customers
          </Text>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Due This Week</Text>
              <Text style={styles.statValue}>{peso(total)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Paid Today</Text>
              <Text style={styles.statValue}>{peso(paidToday)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer or patron..."
            placeholderTextColor={Brand.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {shown.length === 0 && (
          <Text style={styles.emptyText}>
            {customers.length === 0
              ? "No customers yet. Tap + to add your first one."
              : "No customers found."}
          </Text>
        )}

        {shown.map((c) => (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.avatar, { backgroundColor: c.avatarBg }]}>
                <Text style={styles.avatarText}>{c.name[0]}</Text>
              </View>
              <View style={styles.nameCol}>
                <Text style={styles.name} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.last}>{c.last}</Text>
              </View>
              <View style={[styles.tagBadge, { backgroundColor: c.tagBg }]}>
                <Text style={[styles.tagBadgeText, { color: c.tagText }]}>
                  {c.tag}
                </Text>
              </View>
            </View>

            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.balanceLabel}>BALANCE</Text>
                <Text style={styles.balance}>{peso(c.balance)}</Text>
              </View>
              <Pressable
                style={[
                  styles.receivedButton,
                  c.balance === 0 && styles.receivedDone,
                ]}
                onPress={() => markReceived(c.id)}
              >
                <Text style={styles.receivedText}>
                  {c.balance === 0 ? "Paid" : "Received"}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.tipCard}>
          <Text style={styles.tipLabel}>TRUST & COMMUNITY</Text>
          <Text style={styles.tipText}>
            Send a friendly reminder before the weekend. A simple message
            maintains good neighborhood trust!
          </Text>
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <AddModal
        visible={showAdd}
        title="Add Customer (Utang)"
        onClose={() => setShowAdd(false)}
        onSubmit={addCustomer}
        fields={[
          {
            key: "name",
            label: "Customer Name",
            placeholder: "e.g. Aling Rosa",
          },
          {
            key: "balance",
            label: "Starting Balance (₱)",
            placeholder: "e.g. 150 (or 0)",
            numeric: true,
          },
        ]}
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
    paddingBottom: 100,
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
  pill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  pillText: {
    color: Brand.primaryText,
    fontSize: 10,
    fontWeight: "700",
  },
  bannerTitle: {
    color: Brand.primaryText,
    fontSize: 26,
    fontWeight: "700",
  },
  bannerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: Spacing.three,
  },
  statLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
  },
  statValue: {
    color: Brand.primaryText,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  searchBox: {
    backgroundColor: Brand.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: Spacing.three,
    height: 46,
    justifyContent: "center",
  },
  searchInput: {
    fontSize: 14,
    color: Brand.text,
  },
  emptyText: {
    textAlign: "center",
    color: Brand.textMuted,
    marginTop: Spacing.three,
  },
  card: {
    backgroundColor: Brand.card,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "700",
    color: Brand.primary,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: Brand.text,
  },
  last: {
    fontSize: 11,
    color: Brand.textMuted,
    marginTop: 2,
  },
  tagBadge: {
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Brand.textMuted,
  },
  balance: {
    fontSize: 26,
    fontWeight: "700",
    color: Brand.primary,
  },
  receivedButton: {
    backgroundColor: Brand.success,
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  receivedDone: {
    backgroundColor: Brand.textMuted,
  },
  receivedText: {
    color: Brand.primaryText,
    fontWeight: "700",
    fontSize: 13,
  },
  tipCard: {
    backgroundColor: Brand.inputBg,
    borderRadius: 16,
    padding: Spacing.three,
  },
  tipLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Brand.primary,
    marginBottom: Spacing.one,
  },
  tipText: {
    fontSize: 12,
    color: Brand.text,
  },
  fab: {
    position: "absolute",
    right: Spacing.four,
    bottom: Spacing.four,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  fabText: {
    color: Brand.primaryText,
    fontSize: 28,
    lineHeight: 30,
  },
});
