import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AddModal from "@/components/add-modal";
import AppHeader from "@/components/app-header";
import LoadingScreen from "@/components/loading-screen";
import { Brand, Spacing } from "@/constants/theme";
import { getCurrentAccount } from "@/lib/auth";
import { peso } from "@/lib/format";
import {
  hasShownLoading,
  markLoadingShown,
  withMinimumLoading,
} from "@/lib/loading";
import { useInventoryStore } from "@/store/useInventoryStore";

type ActionKind = "restock" | "sell" | "delete";

const LOW_STOCK = 8;

export default function InventoryScreen() {
  // Shared state from Zustand (replaces the old useState + loadList/saveList)
  const items = useInventoryStore((s) => s.items);
  const load = useInventoryStore((s) => s.load);
  const addProduct = useInventoryStore((s) => s.addItem);
  const removeItem = useInventoryStore((s) => s.removeItem);
  const restock = useInventoryStore((s) => s.restock);
  const sell = useInventoryStore((s) => s.sell);

  // Local UI state stays in the component
  const [ready, setReady] = useState(() => hasShownLoading("inventory")); // true after the first load
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [storeName, setStoreName] = useState("Your Store");

  // Restock / Sell / Delete popup
  const [action, setAction] = useState<{ type: ActionKind; id: number } | null>(
    null,
  );
  const [qty, setQty] = useState("1");
  const [actionError, setActionError] = useState("");

  // Reload every time this screen opens, so a different account never sees old data.
  // The first time, the loading screen stays for at least 5 seconds.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      // Load the store data and the store name at the same time
      const work = Promise.all([load(), getCurrentAccount().catch(() => null)]);
      const request = hasShownLoading("inventory")
        ? work
        : withMinimumLoading(work);

      request.then(([, account]) => {
        if (!active) return;
        if (account) setStoreName(account.storeName);
        markLoadingShown("inventory");
        setReady(true);
      });

      return () => {
        active = false;
      };
    }, [load]),
  );

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

    addProduct({
      name: v.name.trim(),
      price,
      stock,
      category: v.category?.trim() || "Others",
    });
    return null;
  }

  function openAction(type: ActionKind, id: number) {
    setAction({ type, id });
    setQty("1");
    setActionError("");
  }

  function closeAction() {
    setAction(null);
    setActionError("");
  }

  function confirmAction() {
    if (!action) return;

    const target = items.find((i) => i.id === action.id);
    if (!target) {
      closeAction();
      return;
    }

    // Delete the product
    if (action.type === "delete") {
      removeItem(target.id);
      closeAction();
      return;
    }

    // Restock or sell: use the typed quantity
    const amount = parseInt(qty, 10);
    if (isNaN(amount) || amount < 1) {
      setActionError("Enter a quantity of 1 or more.");
      return;
    }

    if (action.type === "sell") {
      if (amount > target.stock) {
        setActionError(`Only ${target.stock} left in stock.`);
        return;
      }
      sell(target.id, amount); // updates stock and records the sale
    } else {
      restock(target.id, amount);
    }

    closeAction();
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

  // Details for the popup
  const actionTarget = action
    ? items.find((i) => i.id === action.id)
    : undefined;
  const typedQty = parseInt(qty, 10);
  const previewTotal =
    actionTarget && !isNaN(typedQty) && typedQty > 0
      ? typedQty * actionTarget.price
      : 0;

  let dialogTitle = "";
  if (action && actionTarget) {
    if (action.type === "delete") dialogTitle = `Delete ${actionTarget.name}?`;
    else if (action.type === "restock")
      dialogTitle = `Restock ${actionTarget.name}`;
    else dialogTitle = `Sell ${actionTarget.name}`;
  }

  // Loading screen: shown until the products and store name arrive
  if (!ready) {
    return <LoadingScreen title="Inventory" message="Loading inventory..." />;
  }

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
              <Text style={styles.stockText}>Stock: {item.stock}</Text>
              {item.stock <= LOW_STOCK && (
                <View style={styles.lowBadge}>
                  <Text style={styles.lowBadgeText}>Low Stock</Text>
                </View>
              )}
              <Pressable
                style={styles.deleteButton}
                onPress={() => openAction("delete", item.id)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.smallButton, styles.restock]}
                  onPress={() => openAction("restock", item.id)}
                >
                  <Text style={styles.smallButtonText}>+ Restock</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.smallButton,
                    styles.sell,
                    item.stock === 0 && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    if (item.stock > 0) openAction("sell", item.id);
                  }}
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
          { key: "category", label: "Category", placeholder: "e.g. Drinks" },
        ]}
      />

      <Modal
        visible={action !== null && actionTarget !== undefined}
        transparent
        animationType="fade"
        onRequestClose={closeAction}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{dialogTitle}</Text>

            {action?.type === "delete" ? (
              <Text style={styles.dialogText}>
                This removes the product from your inventory. This cannot be
                undone.
              </Text>
            ) : (
              <>
                <Text style={styles.dialogText}>
                  Current stock: {actionTarget?.stock}
                </Text>
                <Text style={styles.dialogLabel}>Quantity</Text>
                <TextInput
                  style={styles.qtyInput}
                  keyboardType="number-pad"
                  value={qty}
                  autoFocus
                  selectTextOnFocus
                  onChangeText={(t) => {
                    setQty(t.replace(/\D/g, ""));
                    setActionError("");
                  }}
                  onSubmitEditing={confirmAction}
                />
                {action?.type === "sell" && previewTotal > 0 ? (
                  <Text style={styles.dialogText}>
                    Total: {peso(previewTotal)}
                  </Text>
                ) : null}
              </>
            )}

            {actionError ? (
              <Text style={styles.dialogError}>{actionError}</Text>
            ) : null}

            <View style={styles.dialogButtons}>
              <Pressable
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={closeAction}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.dialogButton,
                  action?.type === "restock"
                    ? styles.confirmGreen
                    : styles.confirmRed,
                ]}
                onPress={confirmAction}
              >
                <Text style={styles.confirmText}>
                  {action?.type === "delete"
                    ? "Delete"
                    : action?.type === "restock"
                      ? "Add Stock"
                      : "Confirm Sale"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  deleteButton: {
    marginLeft: "auto",
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
  },
  deleteText: {
    color: Brand.dangerText,
    fontSize: 12,
    fontWeight: "700",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
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
  buttonDisabled: {
    opacity: 0.4,
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Brand.card,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Brand.text,
  },
  dialogText: {
    fontSize: 13,
    color: Brand.textMuted,
  },
  dialogLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.text,
    marginTop: Spacing.two,
  },
  qtyInput: {
    backgroundColor: Brand.inputBg,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    color: Brand.text,
    ...({ outlineStyle: "none" } as object),
  },
  dialogError: {
    color: "#C0392B",
    fontSize: 12,
  },
  dialogButtons: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  dialogButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: Brand.inputBg,
  },
  cancelText: {
    color: Brand.text,
    fontWeight: "600",
    fontSize: 14,
  },
  confirmRed: {
    backgroundColor: Brand.primary,
  },
  confirmGreen: {
    backgroundColor: Brand.success,
  },
  confirmText: {
    color: Brand.primaryText,
    fontWeight: "700",
    fontSize: 14,
  },
});
