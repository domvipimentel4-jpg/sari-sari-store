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
import { getCurrentAccount } from "@/lib/auth";
import { peso } from "@/lib/format";
import { loadList, saveList } from "@/lib/store-data";

type Item = {
  id: number;
  name: string;
  stock: number;
  unit: string;
  price: number;
  tag: string;
  category: string;
};

const LOW_STOCK = 8;

export default function InventoryScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [storeName, setStoreName] = useState("Your Store");

  // Load saved items and the registered store name when the screen opens
  useEffect(() => {
    loadList<Item>("items").then((list) => {
      setItems(list);
      setLoaded(true);
    });
    getCurrentAccount().then((account) => {
      if (account) setStoreName(account.storeName);
    });
  }, []);

  // Save every time items change
  useEffect(() => {
    if (loaded) saveList("items", items);
  }, [items, loaded]);

  // Categories now come from your items
  const categories = [
    "All",
    ...Array.from(new Set(items.map((i) => i.category))),
  ];

  async function addItem(v: Record<string, string>) {
    const price = parseFloat(v.price ?? "");
    const stock = parseInt(v.stock ?? "", 10);

    if (!v.name?.trim()) return "Enter the product name.";
    if (isNaN(price) || price < 0) return "Enter a valid price.";
    if (isNaN(stock) || stock < 0) return "Enter a valid stock number.";

    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: v.name.trim(),
        price,
        stock,
        unit: v.unit?.trim() || "pcs",
        category: v.category?.trim() || "Others",
        tag: v.tag?.trim() || "",
      },
    ]);
    return null;
  }

  async function recordSale(amount: number) {
    const list = await loadList<{ id: number; amount: number; date: string }>(
      "sales",
    );
    await saveList("sales", [
      ...list,
      { id: Date.now(), amount, date: new Date().toDateString() },
    ]);
  }

  function changeStock(id: number, amount: number) {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    // Selling: only counts if there is stock left
    if (amount < 0) {
      if (target.stock === 0) return;
      recordSale(target.price);
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, stock: Math.max(0, item.stock + amount) }
          : item,
      ),
    );
  }

  const shown = items.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalValue = items.reduce(
    (sum, item) => sum + item.stock * item.price,
    0,
  );

  return (
    <View style={styles.screen}>
      <AppHeader title="Inventory" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View style={styles.openPill}>
              <Text style={styles.openPillText}>Open Now</Text>
            </View>
            <Text style={styles.bannerTag}>{storeName}</Text>
          </View>

          <View style={styles.bannerRow}>
            <View>
              <Text style={styles.bannerTitle}>{storeName}</Text>
              <Text style={styles.bannerSub}>{items.length} items tracked</Text>
            </View>
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>ESTIMATED VALUE</Text>
              <Text style={styles.valueText}>{peso(totalValue)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products (e.g. Instant Noodles)..."
            placeholderTextColor={Brand.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map((name) => (
            <Pressable
              key={name}
              style={[styles.chip, category === name && styles.chipActive]}
              onPress={() => setCategory(name)}
            >
              <Text
                style={[
                  styles.chipText,
                  category === name && styles.chipTextActive,
                ]}
              >
                {name === "All" ? `All (${items.length})` : name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {shown.length === 0 && (
          <Text style={styles.emptyText}>
            {items.length === 0
              ? "No products yet. Tap + to add your first one."
              : "No products found."}
          </Text>
        )}

        {shown.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.priceCol}>
                <Text style={styles.price}>{peso(item.price)}</Text>
                <Text style={styles.each}>each</Text>
              </View>
            </View>

            <View style={styles.stockRow}>
              <Text style={styles.stockText}>
                Stock: {item.stock} {item.unit}
              </Text>
              {item.stock <= LOW_STOCK && (
                <View style={styles.lowBadge}>
                  <Text style={styles.lowBadgeText}>Low Stock</Text>
                </View>
              )}
            </View>

            <View style={styles.cardBottom}>
              <Text style={styles.tagText}>{item.tag}</Text>
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.smallButton, styles.restock]}
                  onPress={() => changeStock(item.id, 1)}
                >
                  <Text style={styles.smallButtonText}>+ Restock</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallButton, styles.sell]}
                  onPress={() => changeStock(item.id, -1)}
                >
                  <Text style={styles.smallButtonText}>- Sell</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <AddModal
        visible={showAdd}
        title="Add Product"
        onClose={() => setShowAdd(false)}
        onSubmit={addItem}
        fields={[
          {
            key: "name",
            label: "Product Name",
            placeholder: "e.g. Coke Mismo 295ml",
          },
          {
            key: "price",
            label: "Price (each)",
            placeholder: "e.g. 20",
            numeric: true,
          },
          {
            key: "stock",
            label: "Stock",
            placeholder: "e.g. 12",
            numeric: true,
          },
          { key: "unit", label: "Unit", placeholder: "pcs, bottles, sachets" },
          { key: "category", label: "Category", placeholder: "e.g. Drinks" },
          { key: "tag", label: "Note (optional)", placeholder: "e.g. Chilled" },
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
  openPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  openPillText: {
    color: Brand.primaryText,
    fontSize: 11,
    fontWeight: "600",
  },
  bannerTag: {
    color: Brand.primaryText,
    fontSize: 12,
    fontWeight: "600",
  },
  bannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  bannerTitle: {
    color: Brand.primaryText,
    fontSize: 22,
    fontWeight: "700",
  },
  bannerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  valueBox: {
    alignItems: "flex-end",
  },
  valueLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "700",
  },
  valueText: {
    color: Brand.primaryText,
    fontSize: 22,
    fontWeight: "700",
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
  chipRow: {
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  chipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Brand.text,
  },
  chipTextActive: {
    color: Brand.primaryText,
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
    gap: Spacing.two,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Brand.text,
    marginRight: Spacing.two,
  },
  priceCol: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: Brand.primary,
  },
  each: {
    fontSize: 10,
    color: Brand.textMuted,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  stockText: {
    fontSize: 12,
    color: Brand.textMuted,
  },
  lowBadge: {
    backgroundColor: Brand.dangerBg,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  lowBadgeText: {
    color: Brand.dangerText,
    fontSize: 10,
    fontWeight: "700",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagText: {
    fontSize: 11,
    color: Brand.textMuted,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  smallButton: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  restock: {
    backgroundColor: Brand.success,
  },
  sell: {
    backgroundColor: Brand.primary,
  },
  smallButtonText: {
    color: Brand.primaryText,
    fontSize: 12,
    fontWeight: "700",
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
