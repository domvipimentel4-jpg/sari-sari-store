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
import { peso } from "@/lib/format";
import {
  hasShownLoading,
  markLoadingShown,
  withMinimumLoading,
} from "@/lib/loading";
import { useCreditStore } from "@/store/useCreditStore";

type ActionKind = "pay" | "utang" | "delete";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Keeps only digits and one decimal point
function cleanAmount(text: string) {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return parts[0] + "." + parts.slice(1).join("");
}

export default function CreditScreen() {
  // Shared state from Zustand (replaces the old useState + loadList/saveList)
  const customers = useCreditStore((s) => s.customers);
  const load = useCreditStore((s) => s.load);
  const addCustomerToStore = useCreditStore((s) => s.addCustomer);
  const removeCustomer = useCreditStore((s) => s.removeCustomer);
  const recordPayment = useCreditStore((s) => s.recordPayment);
  const addUtang = useCreditStore((s) => s.addUtang);

  // Local UI state stays in the component
  const [ready, setReady] = useState(() => hasShownLoading("credit"));
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [historyId, setHistoryId] = useState<number | null>(null);

  // Pay / Add utang / Delete popup
  const [action, setAction] = useState<{ type: ActionKind; id: number } | null>(
    null,
  );
  const [amountText, setAmountText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [actionError, setActionError] = useState("");

  // Reload every time this screen opens, so a different account never sees old data
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const work = load();
      const request = hasShownLoading("credit")
        ? work
        : withMinimumLoading(work);

      request.then(() => {
        if (!active) return;
        markLoadingShown("credit");
        setReady(true);
      });

      return () => {
        active = false;
      };
    }, [load]),
  );

  async function addCustomer(v: Record<string, string>) {
    const balance = parseFloat(v.balance || "0");

    if (!v.name?.trim()) return "Enter the customer's name.";
    if (isNaN(balance) || balance < 0) return "Enter a valid balance.";

    addCustomerToStore(v.name.trim(), balance);
    return null;
  }

  function openAction(type: ActionKind, id: number) {
    setAction({ type, id });
    setAmountText("");
    setNoteText("");
    setActionError("");
  }

  function closeAction() {
    setAction(null);
    setActionError("");
  }

  function closeHistory() {
    setHistoryId(null);
  }

  function confirmAction() {
    if (!action) return;

    const target = customers.find((c) => c.id === action.id);
    if (!target) {
      closeAction();
      return;
    }

    // Delete a customer (only offered when fully paid)
    if (action.type === "delete") {
      removeCustomer(target.id);
      closeAction();
      return;
    }

    const amount = round2(parseFloat(amountText));
    if (isNaN(amount) || amount <= 0) {
      setActionError("Enter an amount greater than 0.");
      return;
    }

    if (action.type === "pay") {
      if (amount > target.balance) {
        setActionError(`Balance is only ${peso(target.balance)}.`);
        return;
      }
      recordPayment(target.id, amount);
    } else {
      addUtang(target.id, amount, noteText.trim());
    }

    closeAction();
  }

  if (!ready) {
    return (
      <LoadingScreen title="Credit Ledger" message="Loading customers..." />
    );
  }

  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const total = customers.reduce((sum, c) => sum + c.balance, 0);

  // Paid Today = every payment recorded today, across all customers
  const todayString = new Date().toDateString();
  const paidToday = customers
    .flatMap((c) => c.history ?? [])
    .filter(
      (h) =>
        h.type === "payment" && new Date(h.at).toDateString() === todayString,
    )
    .reduce((sum, h) => sum + h.amount, 0);

  const shown = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Details for the Pay / Add utang / Delete popup
  const actionTarget = action
    ? customers.find((c) => c.id === action.id)
    : undefined;
  const typedAmount = parseFloat(amountText);
  const validAmount = !isNaN(typedAmount) && typedAmount > 0;

  let dialogTitle = "";
  if (action && actionTarget) {
    if (action.type === "delete") dialogTitle = `Delete ${actionTarget.name}?`;
    else if (action.type === "pay")
      dialogTitle = `Payment from ${actionTarget.name}`;
    else dialogTitle = `Add utang for ${actionTarget.name}`;
  }

  let preview = "";
  if (action && actionTarget && validAmount) {
    if (action.type === "pay" && typedAmount <= actionTarget.balance) {
      preview = `Remaining balance: ${peso(round2(actionTarget.balance - typedAmount))}`;
    } else if (action.type === "utang") {
      preview = `New balance: ${peso(round2(actionTarget.balance + typedAmount))}`;
    }
  }

  // Details for the History popup
  const historyTarget =
    historyId !== null ? customers.find((c) => c.id === historyId) : undefined;
  const historyList = historyTarget?.history ?? [];

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

        {shown.map((c) => {
          const isPaid = c.balance === 0;
          const historyCount = (c.history ?? []).length;

          return (
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
                <View
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: isPaid
                        ? Brand.accentGreen
                        : Brand.badgeBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      {
                        color: isPaid ? Brand.accentGreenText : Brand.badgeText,
                      },
                    ]}
                  >
                    {isPaid ? "Paid" : "Has Utang"}
                  </Text>
                </View>
              </View>

              <View>
                <Text style={styles.balanceLabel}>BALANCE</Text>
                <Text style={styles.balance}>{peso(c.balance)}</Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.payButton,
                    isPaid && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    if (!isPaid) openAction("pay", c.id);
                  }}
                >
                  <Text style={styles.actionText}>Pay</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.utangButton]}
                  onPress={() => openAction("utang", c.id)}
                >
                  <Text style={styles.actionText}>+ Add Utang</Text>
                </Pressable>
              </View>

              <View style={styles.linkRow}>
                <Pressable onPress={() => setHistoryId(c.id)}>
                  <Text style={styles.linkText}>
                    View history ({historyCount})
                  </Text>
                </Pressable>
                {isPaid && (
                  <Pressable onPress={() => openAction("delete", c.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

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

      {/* Pay / Add utang / Delete popup */}
      <Modal
        visible={action !== null && actionTarget !== undefined}
        transparent
        animationType="fade"
        onRequestClose={closeAction}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAction} />
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{dialogTitle}</Text>

            {action?.type === "delete" ? (
              <Text style={styles.dialogText}>
                This removes the customer and their history. This cannot be
                undone.
              </Text>
            ) : (
              <>
                <Text style={styles.dialogText}>
                  Current balance: {peso(actionTarget?.balance ?? 0)}
                </Text>

                <Text style={styles.dialogLabel}>Amount (₱)</Text>
                <TextInput
                  style={styles.dialogInput}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 50"
                  placeholderTextColor={Brand.textMuted}
                  value={amountText}
                  autoFocus
                  onChangeText={(t) => {
                    setAmountText(cleanAmount(t));
                    setActionError("");
                  }}
                  onSubmitEditing={confirmAction}
                />

                {action?.type === "pay" && (actionTarget?.balance ?? 0) > 0 ? (
                  <Pressable
                    onPress={() => {
                      setAmountText(String(actionTarget?.balance ?? ""));
                      setActionError("");
                    }}
                  >
                    <Text style={styles.linkText}>Pay full balance</Text>
                  </Pressable>
                ) : null}

                {action?.type === "utang" ? (
                  <>
                    <Text style={styles.dialogLabel}>Note (optional)</Text>
                    <TextInput
                      style={styles.dialogInput}
                      placeholder="e.g. 2 Coke, 1 noodles"
                      placeholderTextColor={Brand.textMuted}
                      value={noteText}
                      onChangeText={setNoteText}
                    />
                  </>
                ) : null}

                {preview ? (
                  <Text style={styles.dialogText}>{preview}</Text>
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
                  action?.type === "pay"
                    ? styles.confirmGreen
                    : styles.confirmRed,
                ]}
                onPress={confirmAction}
              >
                <Text style={styles.confirmText}>
                  {action?.type === "delete"
                    ? "Delete"
                    : action?.type === "pay"
                      ? "Record Payment"
                      : "Add Utang"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* History popup */}
      <Modal
        visible={historyTarget !== undefined}
        transparent
        animationType="fade"
        onRequestClose={closeHistory}
      >
        <View style={styles.overlay}>
          {/* Tap the dark area outside the popup to close it */}
          <Pressable style={StyleSheet.absoluteFill} onPress={closeHistory} />

          <View style={[styles.dialog, styles.historyDialog]}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle} numberOfLines={1}>
                {historyTarget?.name}&apos;s History
              </Text>
              <Pressable
                style={styles.closeX}
                onPress={closeHistory}
                hitSlop={10}
              >
                <Text style={styles.closeXText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.dialogText}>
              Current balance: {peso(historyTarget?.balance ?? 0)}
            </Text>

            <ScrollView
              style={styles.historyScroll}
              contentContainerStyle={styles.historyList}
              showsVerticalScrollIndicator
            >
              {historyList.length === 0 ? (
                <Text style={styles.historyEmpty}>No history yet.</Text>
              ) : (
                [...historyList].reverse().map((h) => (
                  <View key={h.id} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyType}>
                        {h.type === "payment" ? "Payment" : "Utang added"}
                      </Text>
                      <Text style={styles.historyDate}>
                        {formatWhen(h.at)}
                        {h.note ? ` • ${h.note}` : ""}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.historyAmount,
                        h.type === "payment"
                          ? styles.amountPaid
                          : styles.amountUtang,
                      ]}
                    >
                      {h.type === "payment" ? "-" : "+"}
                      {peso(h.amount)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <Pressable
              style={[
                styles.dialogButton,
                styles.confirmRed,
                styles.closeButton,
              ]}
              onPress={closeHistory}
            >
              <Text style={styles.confirmText}>Close</Text>
            </Pressable>
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
  actionRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: "center",
  },
  payButton: {
    backgroundColor: Brand.success,
  },
  utangButton: {
    backgroundColor: Brand.primary,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  actionText: {
    color: Brand.primaryText,
    fontWeight: "700",
    fontSize: 13,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkText: {
    color: Brand.link,
    fontSize: 12,
    fontWeight: "700",
  },
  deleteText: {
    color: Brand.dangerText,
    fontSize: 12,
    fontWeight: "700",
  },
  historyDialog: {
    maxHeight: "85%",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  historyTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: Brand.text,
  },
  closeX: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  closeXText: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.text,
  },
  historyScroll: {
    flexGrow: 0,
    flexShrink: 1,
    backgroundColor: Brand.inputBg,
    borderRadius: 12,
    marginTop: Spacing.two,
  },
  historyList: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  historyEmpty: {
    fontSize: 12,
    color: Brand.textMuted,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  historyLeft: {
    flex: 1,
  },
  historyType: {
    fontSize: 13,
    fontWeight: "700",
    color: Brand.text,
  },
  historyDate: {
    fontSize: 11,
    color: Brand.textMuted,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  amountPaid: {
    color: Brand.success,
  },
  amountUtang: {
    color: Brand.primary,
  },
  closeButton: {
    flex: 0,
    flexShrink: 0,
    marginTop: Spacing.three,
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
  dialogInput: {
    backgroundColor: Brand.inputBg,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
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
