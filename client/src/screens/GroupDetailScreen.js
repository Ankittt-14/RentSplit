import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Dimensions, Modal, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { groupService, expenseService, paymentService, settlementService, claimService } from "../services";
import { Avatar, EmptyState, Spinner, Badge, Button } from "../components/ui";
import CustomAlert from "../components/ui/CustomAlert";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS, CATEGORY_ICONS } from "../utils/theme";
import { formatCurrency, formatDate } from "../utils/helpers";

const { width } = Dimensions.get("window");
const TABS = ["Expenses", "Budget", "Balances", "Settle Up"];

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName, defaultTab } = route.params;
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const { joinGroup, leaveGroup, on, off } = useSocket();
  const { loading, execute } = useApi();

  const [activeTab,   setActiveTab]   = useState(defaultTab || "Expenses");
  const [group,       setGroup]       = useState(null);
  const [expenses,    setExpenses]    = useState([]);
  const [summary,     setSummary]     = useState({});
  const [settlements, setSettlements] = useState([]);
  const [debts,       setDebts]       = useState([]);
  const [payHistory,  setPayHistory]  = useState([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [pendingClaims, setPendingClaims] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [payModal,    setPayModal]    = useState(null);
  const [payNote,     setPayNote]     = useState("");
  const [payBusy,     setPayBusy]     = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success",
    onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
    onCancel: null,
    confirmText: "OK",
    cancelText: "Cancel"
  });

  const showAlert = (title, message, type = "success", onConfirm = null, onCancel = null, confirmText = "OK", cancelText = "Cancel") => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: onCancel ? () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        onCancel();
      } : null,
      confirmText,
      cancelText
    });
  };

  const isLeader = group?.leader?._id === user?._id;

  const loadAll = useCallback(async () => {
    try {
      const [gRes, eRes, sumRes, sRes, cRes, dRes, pRes] = await Promise.all([
        execute(() => groupService.getOne(groupId)),
        execute(() => expenseService.getAll(groupId)),
        execute(() => groupService.getSummary(groupId)),
        execute(() => settlementService.getAll(groupId)),
        execute(() => claimService.getAll(groupId)),
        execute(() => paymentService.getDebts(groupId)),
        execute(() => paymentService.getAll(groupId)),
      ]);
      setGroup(gRes.group || gRes);
      setExpenses(eRes || []);
      setSummary(sumRes || {});
      setSettlements(sRes || []);
      setPendingClaims((cRes || []).filter(c => c.status === "pending").length);
      // Count pending payment requests from the summary's pendingSummary field
      setPendingPayments((sumRes?.pendingSummary || []).length);
      setDebts(Array.isArray(dRes) ? dRes : []);
      setPayHistory(Array.isArray(pRes) ? pRes : []);
    } catch {}
  }, [groupId]);

  useEffect(() => {
    loadAll();
    joinGroup?.(groupId);

    const onAdded   = () => loadAll(); // Just reload everything on new expense for simplicity
    const onDeleted = () => loadAll();

    on?.("expense:added",   onAdded);
    on?.("expense:deleted", onDeleted);
    on?.("group:updated",   onAdded); // Reuse onAdded to reload everything
    on?.("payment:approved", onAdded);

    return () => {
      leaveGroup?.(groupId);
      off?.("expense:added",   onAdded);
      off?.("expense:deleted", onDeleted);
      off?.("group:updated",   onAdded);
      off?.("payment:approved", onAdded);
    };
  }, [groupId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const markPaid = (exp, amount) => {
    setPayModal({
      from: { _id: user._id, name: user.name },
      to: exp.paidBy,
      amount: amount,
      expenseId: exp._id,
      isExpense: true
    });
    setPayNote(`For ${exp.description || 'expense'}`);
  };

  const sendReminders = async () => {
    try {
      const res = await execute(() => paymentService.remind(groupId));
      showAlert("Sent", `Sent reminders to ${res?.reminded || 0} members.`, "success");
    } catch (err) {
      showAlert("Error", "Could not send reminders.", "error");
    }
  };

  const onSettleDelete = async (sid) => {
    try {
      await execute(() => settlementService.delete(sid));
      loadAll();
    } catch {}
  };

  const confirmSettle = async () => {
    if (!payModal) return;
    setPayBusy(true);
    try {
      await paymentService.settle({
        groupId,
        expenseId: payModal.expenseId,
        toUserId: payModal.to._id,
        amount: payModal.amount,
        note: payNote.trim(),
      });
      setPayModal(null);
      loadAll();
      showAlert("Payment Recorded", `You paid ${formatCurrency(payModal.amount)} to ${payModal.to.name}.`, "success");
    } catch (err) {
      showAlert("Error", err?.response?.data?.message || "Could not record payment.", "error");
    } finally {
      setPayBusy(false);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    showAlert(
      "Remove Member",
      `Are you sure you want to remove ${userName} from the group?`,
      "warning",
      async () => {
        try {
          await execute(() => groupService.removeMember(groupId, userId));
          loadAll();
          showAlert("Removed", `${userName} has been removed.`, "success");
        } catch (err) {
          showAlert("Error", err.response?.data?.message || "Could not remove member.", "error");
        }
      },
      () => {}, // Cancel
      "Remove",
      "Cancel"
    );
  };

  // ── Expenses Tab (Timeline Feed) ────────────────────────────────────────────
  const ExpensesTab = () =>
    expenses.length === 0
      ? <EmptyState icon="receipt-long" title="No expenses yet" subtitle={isLeader ? "Tap + to add an expense." : "Leader hasn't added any expenses yet."} />
      : expenses.map((exp) => {
          const split = exp.splits.find(s => (s.user?._id || s.user)?.toString() === user?._id?.toString());
          const oweAmount = split ? split.amountOwed : 0;
          const hasPaid = split?.hasPaid || false;

          return (
            <TouchableOpacity
              key={exp._id}
              onPress={() => navigation.navigate("ExpenseDetail", { expenseId: exp._id })}
              activeOpacity={0.85}
              style={{ backgroundColor: "#ffffff", borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.md, ...SHADOWS.card }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
                <View style={{ width: 54, height: 54, backgroundColor: COLORS.primaryContainer, borderRadius: RADIUS.lg, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MaterialIcons name={CATEGORY_ICONS[exp.category] || "receipt-long"} size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: COLORS.onSurface, fontSize: 16 }} numberOfLines={1}>{exp.description}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2 }}>
                    {formatDate(exp.createdAt)} · Paid by {exp.paidBy?.name?.split(" ")[0]}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: COLORS.onSurface, letterSpacing: -0.5 }}>
                    {formatCurrency(exp.amount)}
                  </Text>
                  {oweAmount > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: "800", color: hasPaid ? COLORS.primary : COLORS.error, marginTop: 4 }}>
                      {hasPaid ? "You Paid: " : "You Owe: "}{formatCurrency(oweAmount)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Pay Button / Status embedded in card if unpaid */}
              {oweAmount > 0 && !hasPaid && (() => {
                const isPending = (summary?.pendingSummary || []).some(
                  p => p.expenseId === exp._id && (p.from?._id === user?._id || p.from === user?._id)
                );

                return (
                  <View style={{ marginTop: SPACING.xl, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", flexDirection: "row", justifyContent: "flex-end" }}>
                    {isPending ? (
                      <View style={{ backgroundColor: "rgba(0,0,0,0.04)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, flexDirection: "row", alignItems: "center", gap: 6, opacity: 0.8 }}>
                        <MaterialIcons name="hourglass-empty" size={14} color={COLORS.onSurfaceVariant} />
                        <Text style={{ fontWeight: "700", color: COLORS.onSurfaceVariant, fontSize: 12, textTransform: "uppercase" }}>Pending Approval</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => markPaid(exp, oweAmount)}
                        style={{ backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.full, flexDirection: "row", alignItems: "center", gap: 6 }}
                      >
                        <MaterialIcons name="check-circle" size={16} color="#ffffff" />
                        <Text style={{ fontWeight: "700", color: "#ffffff", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>Mark Paid</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </TouchableOpacity>
          );
        });

  // ── Budget Tab ──────────────────────────────────────────────────────────────
  const BudgetTab = () => {
    const b = summary.budget || 0;
    const s = summary.totalSpent || 0;
    const budgetSet  = b > 0;
    const progress   = budgetSet ? Math.min((s / b) * 100, 100) : 0;
    const overBudget = s > b && budgetSet;

    return (
      <View>
        <View style={{ backgroundColor: COLORS.surfaceContainerLowest, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, ...SHADOWS.card }}>
          <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.onSurfaceVariant, marginBottom: SPACING.lg }}>Trip Budget</Text>

          {budgetSet ? (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <Text style={{ fontSize: 42, fontWeight: "900", color: overBudget ? COLORS.error : COLORS.primary, letterSpacing: -2 }}>
                  {formatCurrency(s)}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.onSurfaceVariant }}>/ {formatCurrency(b)}</Text>
              </View>
              <View style={{ height: 8, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: RADIUS.full, overflow: "hidden", marginBottom: 16 }}>
                <LinearGradient
                  colors={overBudget ? [COLORS.error, "#ba1a1a"] : [COLORS.primary, COLORS.secondary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ width: `${Math.max(progress, 5)}%`, height: "100%", borderRadius: RADIUS.full }}
                />
              </View>
              {overBudget && <Text style={{ fontSize: 13, color: COLORS.error, fontWeight: "700", marginBottom: 12 }}>Over budget by {formatCurrency(s - b)}</Text>}
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: SPACING.lg, gap: 6 }}>
              <MaterialIcons name="account-balance" size={32} color={COLORS.outlineVariant} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.onSurfaceVariant }}>No budget set yet</Text>
              <Text style={{ fontSize: 12, color: COLORS.outlineVariant }}>Total spent: {formatCurrency(s)}</Text>
            </View>
          )}

          {isLeader && (
            <TouchableOpacity
              onPress={() => { setBudgetInput(b > 0 ? b.toString() : ""); setBudgetModal(true); }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: RADIUS.lg, backgroundColor: "rgba(0,0,0,0.04)", marginTop: budgetSet ? 8 : SPACING.md }}
            >
              <MaterialIcons name="edit" size={16} color={COLORS.onSurfaceVariant} />
              <Text style={{ fontWeight: "700", color: COLORS.onSurfaceVariant, fontSize: 14 }}>{budgetSet ? "Edit Budget" : "Set Budget"}</Text>
            </TouchableOpacity>
          )}
        </View>


        <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: COLORS.onSurfaceVariant, marginBottom: SPACING.md, marginLeft: 4 }}>
          Member Collection Status
        </Text>

        {(summary.memberStatus || []).map((ms) => {
          const isMe       = ms.user._id === user._id || ms.user._id?.toString() === user._id;
          const badgeColor   = ms.status === "paid" ? "#16a34a" : ms.status === "partial" ? "#b45309" : COLORS.error;
          const bgBadgeColor = ms.status === "paid" ? "#dcfce7"  : ms.status === "partial" ? "#fef3c7" : COLORS.errorContainer;

          return (
            <View key={ms.user._id} style={{
              backgroundColor: isMe ? "#f0fdf4" : "#ffffff",
              borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md,
              borderWidth: isMe ? 1 : 0, borderColor: isMe ? "#bbf7d0" : "transparent",
              ...SHADOWS.card
            }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Avatar name={ms.user.name} photo={ms.user.profilePhoto} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontWeight: "700", fontSize: 15, color: COLORS.onSurface }}>{ms.user.name}</Text>
                    {isMe && <Text style={{ fontSize: 10, fontWeight: "700", color: "#16a34a", backgroundColor: "#dcfce7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 }}>YOU</Text>}
                  </View>
                  <Text style={{ fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2 }}>
                    Paid: {formatCurrency(ms.amountPaid)} / Due: {formatCurrency(ms.amountDue)}
                  </Text>
                  {ms.remaining > 0 && (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.error, marginTop: 1 }}>
                      Still owes: {formatCurrency(ms.remaining)}
                    </Text>
                  )}
                </View>
                <View style={{ backgroundColor: bgBadgeColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full }}>
                  <Text style={{ color: badgeColor, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>{ms.status}</Text>
                </View>
              </View>

              {/* Pay my share button — only for current user's row if they still owe */}
              {isMe && ms.remaining > 0 && (() => {
                // Find who to pay — the group leader
                const leaderMember = summary.memberStatus?.find(m => {
                  const lid = group?.leader?._id || group?.leader;
                  return m.user._id?.toString() === lid?.toString() || m.user._id === lid;
                });
                const toUser = leaderMember?.user || { _id: group?.leader?._id || group?.leader, name: "Leader" };
                return (
                  <TouchableOpacity
                    onPress={() => { setPayModal({ from: { _id: user._id, name: user.name }, to: toUser, amount: ms.remaining }); setPayNote(""); }}
                    activeOpacity={0.85}
                    style={{ marginTop: SPACING.md, backgroundColor: COLORS.primaryContainer, borderRadius: RADIUS.lg, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <MaterialIcons name="payments" size={18} color={COLORS.primary} />
                    <Text style={{ fontWeight: "800", color: COLORS.primary, fontSize: 14 }}>
                      Pay my share — {formatCurrency(ms.remaining)}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          );
        })}

        {isLeader && summary.memberStatus?.some(m => m.status !== "paid") && (
           <Button title="Remind Unpaid Members" icon="notifications-active" onPress={sendReminders} style={{ marginTop: SPACING.md }} />
        )}
      </View>
    );
  };

  // ── Split Tab (Minimum Settlement) ──────────────────────────────────────────
  const SplitTab = () => {
    // A real app would calculate the optimal settlement graph here.
    // We'll show a simplified version combining balances.
    return (
      <View>
        <LinearGradient
          colors={[COLORS.primaryContainer, COLORS.primary]}
          style={{ padding: SPACING.xl, borderRadius: RADIUS.xl, marginBottom: SPACING.xl, ...SHADOWS.primary }}
        >
          <MaterialIcons name="pie-chart" size={32} color={COLORS.secondary} style={{ marginBottom: 8 }} />
          <Text style={{ fontSize: 24, fontWeight: "900", color: COLORS.secondary, letterSpacing: -1 }}>Equal Split Breakdown</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4, lineHeight: 20 }}>
            Total expenses of {formatCurrency(summary.totalSpent || 0)} divided equally among {summary.memberCount || 1} members.
          </Text>
          <View style={{ backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.md, marginTop: 16 }}>
            <Text style={{ color: COLORS.surface, fontWeight: "800", fontSize: 16 }}>Each pays: {formatCurrency(summary.sharePerMember || 0)}</Text>
          </View>
        </LinearGradient>

        <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: COLORS.onSurfaceVariant, marginBottom: SPACING.md, marginLeft: 4 }}>
          Who owes what
        </Text>

        {(summary.memberStatus || []).filter(m => m.remaining > 0).length === 0 ? (
          <EmptyState icon="check-circle" title="All Cleared up!" subtitle="Everyone has paid their full share." />
        ) : (
          (summary.memberStatus || []).filter(m => m.remaining > 0).map(ms => (
            <View key={ms.user._id} style={{ backgroundColor: "#ffffff", padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...SHADOWS.card }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar name={ms.user.name} photo={ms.user.profilePhoto} size={36} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.onSurface }}>{ms.user.name}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant, fontWeight: "500" }}>owes</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.error }}>{formatCurrency(ms.remaining)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  // ── Settle Up Tab ───────────────────────────────────────────────────────────
  const SettleUpTab = () => {
    const myDebts    = debts.filter(d => d.from._id === user._id || d.from._id?.toString() === user._id);
    const otherDebts = debts.filter(d => d.from._id !== user._id && d.from._id?.toString() !== user._id);
    const allClear   = debts.length === 0;

    return (
      <View>
        {/* ── Section 1: Debt Graph ── */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, ...SHADOWS.card }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.lg }}>
            <MaterialIcons name="account-balance-wallet" size={20} color={COLORS.primaryContainer} />
            <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.onSurface, letterSpacing: -0.3 }}>Who Pays Whom</Text>
          </View>

          {allClear ? (
            <View style={{ alignItems: "center", paddingVertical: SPACING.xl, gap: 8 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="check-circle" size={28} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.onSurface }}>All Settled Up!</Text>
              <Text style={{ fontSize: 13, color: COLORS.onSurfaceVariant, textAlign: "center" }}>Everyone has paid their full share.</Text>
            </View>
          ) : (
            <View style={{ gap: SPACING.md }}>
              {/* My debts — highlighted */}
              {myDebts.map((d, i) => (
                <View key={`my-${i}`} style={{
                  borderRadius: RADIUS.lg, padding: SPACING.lg,
                  backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa",
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: SPACING.md }}>
                    <Avatar name={d.from.name} photo={d.from.profilePhoto} size={34} />
                    <MaterialIcons name="arrow-forward" size={16} color={COLORS.onSurfaceVariant} />
                    <Avatar name={d.to.name} photo={d.to.profilePhoto} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: "#92400e", fontWeight: "600" }}>You owe {d.to.name}</Text>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: "#ef4444", letterSpacing: -0.5 }}>{formatCurrency(d.amount)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => { setPayModal(d); setPayNote(""); }}
                    activeOpacity={0.85}
                    style={{ backgroundColor: COLORS.primaryContainer, borderRadius: RADIUS.xl, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <MaterialIcons name="payments" size={18} color={COLORS.primary} />
                    <Text style={{ fontWeight: "800", color: COLORS.primary, fontSize: 14 }}>Pay {formatCurrency(d.amount)}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Other members' debts — read-only */}
              {otherDebts.map((d, i) => (
                <View key={`other-${i}`} style={{
                  borderRadius: RADIUS.lg, padding: SPACING.lg,
                  backgroundColor: "rgba(0,0,0,0.03)",
                  flexDirection: "row", alignItems: "center", gap: 10,
                }}>
                  <Avatar name={d.from.name} photo={d.from.profilePhoto} size={32} />
                  <MaterialIcons name="arrow-forward" size={14} color={COLORS.outlineVariant} />
                  <Avatar name={d.to.name} photo={d.to.profilePhoto} size={32} />
                  <View style={{ flex: 1, marginLeft: 4 }}>
                    <Text style={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontWeight: "500" }}>
                      {d.from.name} → {d.to.name}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.error }}>{formatCurrency(d.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Section 2: Payment History ── */}
        <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: COLORS.onSurfaceVariant, marginBottom: SPACING.md, marginLeft: 4 }}>
          Payment History
        </Text>

        {payHistory.filter(p => p.toUser).length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 6 }}>
            <MaterialIcons name="history" size={28} color={COLORS.outlineVariant} />
            <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant }}>No payments recorded yet.</Text>
          </View>
        ) : (
          payHistory.filter(p => p.toUser).map((p) => {
            const isPending  = p.status === 'pending';
            const isRejected = p.status === 'rejected';
            const iconName   = isPending ? 'schedule' : isRejected ? 'cancel' : 'check';
            const color      = isPending ? '#f59e0b'  : isRejected ? COLORS.error : '#16a34a';
            const bgColor    = isPending ? '#fef3c7'  : isRejected ? COLORS.errorContainer : '#dcfce7';

            return (
              <View key={p._id} style={{ backgroundColor: "#ffffff", borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, flexDirection: "row", alignItems: "center", gap: 12, opacity: isRejected ? 0.6 : 1, ...SHADOWS.card }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name={iconName} size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.onSurface }}>
                    {p.paidBy?.name} → {p.toUser?.name}
                  </Text>
                  {p.note ? <Text style={{ fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 1 }}>{p.note}</Text> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>{formatDate(p.createdAt)}</Text>
                    {isPending && <Text style={{ fontSize: 10, fontWeight: "700", color: "#f59e0b", backgroundColor: "#fef3c7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, textTransform: 'uppercase' }}>Pending</Text>}
                    {isRejected && <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.error, backgroundColor: COLORS.errorContainer, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, textTransform: 'uppercase' }}>Rejected</Text>}
                  </View>
                </View>
                <Text style={{ fontSize: 17, fontWeight: "900", color, letterSpacing: -0.5 }}>{formatCurrency(p.amount)}</Text>
              </View>
            );
          })
        )}
      </View>
    );
  };

  const tabContent = {
    "Expenses":  <ExpensesTab />,
    "Budget":    <BudgetTab />,
    "Balances":  <SplitTab />,
    "Settle Up": <SettleUpTab />,
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar
        title={groupName}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate("Claims", { groupId, groupName })} style={{ backgroundColor: COLORS.primaryContainer, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", ...SHADOWS.card }}>
            <MaterialIcons name="receipt-long" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 80, paddingHorizontal: SPACING.xl, paddingBottom: 150 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryContainer} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Group Balance Hero Card */}
        <LinearGradient
          colors={["#0D5C46", "#094030"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 32,
            padding: 24,
            marginBottom: SPACING.xxl,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            shadowColor: "#052e22", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 15
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
                Total Group Balance
              </Text>
              <Text style={{ color: "#D9F99D", fontSize: 44, fontWeight: "900", letterSpacing: -1.5 }}>
                {formatCurrency(summary.totalSpent || 0)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {isLeader && (
                <TouchableOpacity
                   onPress={() => showAlert("Group Invite Code", `Share this code with your friends: ${group?.inviteCode}`, "info", null, null, "Copy to Clipboard")}
                   style={{ backgroundColor: "rgba(255,255,255,0.15)", width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
                >
                  <MaterialIcons name="person-add" size={22} color="#D9F99D" />
                </TouchableOpacity>
              )}
              <View style={{ backgroundColor: "rgba(0,0,0,0.2)", width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="bar-chart" size={24} color="#D9F99D" />
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowMembers(true)}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", marginTop: 28 }}
          >
            <View style={{ flexDirection: "row-reverse" }}>
              {(group?.members || []).slice(0, 4).map((m, i) => (
                <View key={m._id} style={{ marginLeft: i === 0 ? 0 : -12, borderWidth: 2, borderColor: "#0D5C46", borderRadius: 14 }}>
                  <Avatar name={m.name} photo={m.profilePhoto} size={28} />
                </View>
              ))}
              {(group?.members || []).length > 4 && (
                <View style={{ backgroundColor: "rgba(255,255,255,0.2)", width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginLeft: -12, borderWidth: 2, borderColor: "#0D5C46" }}>
                  <Text style={{ color: "white", fontSize: 10, fontWeight: "800" }}>+{(group?.members || []).length - 4}</Text>
                </View>
              )}
            </View>
            <Text style={{ marginLeft: 16, color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" }}>
              {group?.members?.length || 0} members splitting
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Pending Approvals (Leader only) — includes both claims & payment requests */}
        {isLeader && (pendingClaims > 0 || pendingPayments > 0) && (
          <TouchableOpacity
            onPress={() => navigation.navigate("NotificationsTab")}
            activeOpacity={0.85}
            style={{ 
              backgroundColor: "white", borderRadius: RADIUS.xl, padding: 20, 
              marginBottom: SPACING.xxl, flexDirection: "row", alignItems: "center", gap: 16,
              borderWidth: 1, borderColor: "#fde68a", ...SHADOWS.card
            }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#fef9c3", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="notifications-active" size={24} color="#b45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>Action Required</Text>
              <Text style={{ fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 2 }}>
                {[
                  pendingPayments > 0 ? `${pendingPayments} payment${pendingPayments !== 1 ? 's' : ''} to verify` : null,
                  pendingClaims > 0   ? `${pendingClaims} claim${pendingClaims !== 1 ? 's' : ''} to review` : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.outlineVariant} />
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.xl }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
                style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.full, backgroundColor: activeTab === tab ? COLORS.primaryContainer : "rgba(0,0,0,0.04)" }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: activeTab === tab ? COLORS.primary : COLORS.onSurfaceVariant }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading && !refreshing ? <Spinner /> : tabContent[activeTab]}
      </ScrollView>

      {/* Member Management Modal */}
      <Modal visible={showMembers} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: "70%", padding: SPACING.xl }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.xl }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.onSurface }}>Group Members</Text>
              <TouchableOpacity onPress={() => setShowMembers(false)} style={{ backgroundColor: "rgba(0,0,0,0.04)", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="close" size={20} color={COLORS.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(group?.members || []).map((m) => (
                <View key={m._id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", padding: 16, borderRadius: RADIUS.xl, marginBottom: 12, ...SHADOWS.card }}>
                  <Avatar name={m.name} photo={m.profilePhoto} size={44} />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.onSurface }}>{m.name}</Text>
                    <Text style={{ fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 2 }}>{m.email}</Text>
                    {group?.leader === m._id && (
                      <View style={{ alignSelf: "flex-start", backgroundColor: COLORS.primaryContainer, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: COLORS.primary, textTransform: "uppercase" }}>Leader</Text>
                      </View>
                    )}
                  </View>
                  {isLeader && m._id !== user._id && (
                    <TouchableOpacity 
                      onPress={() => handleRemoveMember(m._id, m.name)}
                      style={{ backgroundColor: `${COLORS.error}15`, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
                    >
                      <MaterialIcons name="person-remove" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Pay Modal ── */}
      <Modal visible={!!payModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: SPACING.xl, paddingBottom: 40 }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.outlineVariant, alignSelf: "center", marginBottom: SPACING.xl }} />

            <Text style={{ fontSize: 22, fontWeight: "900", color: COLORS.onSurface, letterSpacing: -0.5, marginBottom: 4 }}>Confirm Payment</Text>
            <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: SPACING.xl }}>
              You are paying {payModal?.to?.name}
            </Text>

            {/* Amount display */}
            <View style={{ backgroundColor: "#fff7ed", borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: "center", marginBottom: SPACING.xl, borderWidth: 1, borderColor: "#fed7aa" }}>
              <Text style={{ fontSize: 11, color: "#92400e", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Amount</Text>
              <Text style={{ fontSize: 40, fontWeight: "900", color: "#ef4444", letterSpacing: -1.5 }}>{formatCurrency(payModal?.amount || 0)}</Text>
            </View>

            {/* Note field */}
            <TextInput
              placeholder="Add a note (optional)..."
              placeholderTextColor={COLORS.outline}
              value={payNote}
              onChangeText={setPayNote}
              style={{
                backgroundColor: "rgba(0,0,0,0.03)", borderRadius: RADIUS.lg,
                paddingHorizontal: SPACING.lg, paddingVertical: 14,
                fontSize: 15, color: COLORS.onSurface, fontWeight: "500",
                marginBottom: SPACING.xl,
              }}
            />

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: SPACING.md }}>
              <TouchableOpacity
                onPress={() => setPayModal(null)}
                style={{ flex: 1, paddingVertical: 16, borderRadius: RADIUS.xl, alignItems: "center", backgroundColor: "rgba(0,0,0,0.04)" }}
              >
                <Text style={{ fontWeight: "700", color: COLORS.onSurfaceVariant, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmSettle}
                disabled={payBusy}
                activeOpacity={0.85}
                style={{ flex: 2, paddingVertical: 16, borderRadius: RADIUS.xl, alignItems: "center", backgroundColor: COLORS.primary, opacity: payBusy ? 0.6 : 1 }}
              >
                <Text style={{ fontWeight: "800", color: "#ffffff", fontSize: 15 }}>
                  {payBusy ? "Recording..." : `Pay ${formatCurrency(payModal?.amount || 0)}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Budget Modal ── */}
      <Modal visible={budgetModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: SPACING.xl, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.outlineVariant, alignSelf: "center", marginBottom: SPACING.xl }} />
            <Text style={{ fontSize: 22, fontWeight: "900", color: COLORS.onSurface, letterSpacing: -0.5, marginBottom: SPACING.xl }}>Set Group Budget</Text>
            <TextInput
              placeholder="Enter total budget (e.g. 5000)"
              placeholderTextColor={COLORS.outline}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              autoFocus
              style={{
                backgroundColor: "rgba(0,0,0,0.03)", borderRadius: RADIUS.lg,
                paddingHorizontal: SPACING.lg, paddingVertical: 14,
                fontSize: 20, color: COLORS.onSurface, fontWeight: "700",
                marginBottom: SPACING.xl,
              }}
            />
            <View style={{ flexDirection: "row", gap: SPACING.md }}>
              <TouchableOpacity
                onPress={() => setBudgetModal(false)}
                style={{ flex: 1, paddingVertical: 16, borderRadius: RADIUS.xl, alignItems: "center", backgroundColor: "rgba(0,0,0,0.04)" }}
              >
                <Text style={{ fontWeight: "700", color: COLORS.onSurfaceVariant, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const val = Number(budgetInput);
                  if (!budgetInput || isNaN(val) || val <= 0) return showAlert("Invalid", "Please enter a valid amount.", "error");
                  await execute(() => groupService.setBudget(groupId, val));
                  setBudgetModal(false);
                  loadAll();
                }}
                style={{ flex: 2, paddingVertical: 16, borderRadius: RADIUS.xl, alignItems: "center", backgroundColor: COLORS.primaryContainer }}
              >
                <Text style={{ fontWeight: "800", color: COLORS.primary, fontSize: 15 }}>Save Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => navigation.navigate("AddExpense", { groupId, groupName })}
        activeOpacity={0.85}
        style={{ position: "absolute", bottom: 90, right: 24, width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.secondaryFixed, alignItems: "center", justifyContent: "center", ...SHADOWS.accent }}
      >
        <MaterialIcons name="add" size={30} color={COLORS.onSecondaryFixed} />
      </TouchableOpacity>

      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </View>
  );
}