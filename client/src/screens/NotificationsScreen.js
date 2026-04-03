import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocket } from "../context/SocketContext";
import { useApi } from "../hooks/useApi";
import { groupService, notificationService, claimService, paymentService } from "../services";
import { Button, Input, Spinner, Avatar, EmptyState } from "../components/ui";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";
import { timeAgo, formatCurrency } from "../utils/helpers";

const NOTIF_ICONS = {
  expense:          "payments",
  expense_added:    "payments",
  expense_deleted:  "delete",
  claim_submitted:  "fact-check",
  claim_approved:   "check-circle",
  claim_rejected:   "cancel",
  reminder:         "notifications-active",
  settlement:       "handshake",
  payment:          "check-circle",
  payment_request:  "pending",
  payment_approved: "verified",
};

const NOTIF_COLORS = {
  payment:          "#16a34a",
  payment_approved: "#16a34a",
  claim_approved:   "#16a34a",
  claim_rejected:   "#ef4444",
  reminder:         "#f59e0b",
  expense:          "#0a7c57",
  expense_added:    "#0a7c57",
  payment_request:  "#2563eb",
};

export default function NotificationsScreen() {
  const insets  = useSafeAreaInsets();
  const { on, off } = useSocket() || {};
  const { execute } = useApi();

  const [notifs, setNotifs] = useState([]);
  const [owedSummary, setOwedSummary] = useState({ totalOwed: 0, groupCount: 0 });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Track locally actioned notification IDs so buttons hide immediately after action
  const [resolved, setResolved] = useState(new Set());

  const load = async () => {
    try {
      setLoading(true);
      
      // Fetch notifications and owed summary separately for resilience
      const nPromise = execute(() => notificationService.getAll()).catch(err => {
        console.warn("Failed to load notifications:", err);
        return [];
      });
      
      const oPromise = execute(() => groupService.getOwedSummary()).catch(err => {
        console.warn("Failed to load owed summary:", err);
        return { totalOwed: 0, groupCount: 0 };
      });

      const [nRes, oRes] = await Promise.all([nPromise, oPromise]);
      
      setNotifs(nRes || []);
      setOwedSummary(oRes || { totalOwed: 0, groupCount: 0 });
    } catch (err) {
      console.error("Error in load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleNew = (n) => {
      setNotifs((prev) => [n, ...prev]);
    };
    on?.("notification", handleNew);
    return () => off?.("notification", handleNew);
  }, []);


  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markRead = async (id) => {
    try {
      await execute(() => notificationService.markRead(id));
      setNotifs((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await execute(() => notificationService.markAllRead());
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      Alert.alert("Error", "Could not mark all as read.");
    }
  };

  const unreadCount = notifs.filter((n) => !n.read).length;
  const todayNotifs = notifs.filter((n) => new Date(n.createdAt).toDateString() === new Date().toDateString());
  const olderNotifs = notifs.filter((n) => new Date(n.createdAt).toDateString() !== new Date().toDateString());

  const handleAction = async (id, action, type) => {
    try {
      if (type === 'payment_request') {
        if (action === 'approve') await execute(() => paymentService.approvePayment(id));
        else await execute(() => paymentService.rejectPayment(id));
        Alert.alert('Done', `Payment ${action}d successfully.`);
      } else {
        if (action === 'approve') await execute(() => claimService.approve(id));
        else await execute(() => claimService.reject(id));
        Alert.alert('Done', `Claim ${action}d successfully.`);
      }
      // Mark this notification as resolved locally so buttons hide immediately
      setResolved(prev => new Set([...prev, id]));
      load();
    } catch (err) {
      Alert.alert('Error', `Could not ${action}.`);
    }
  };

  const NotifItem = ({ n }) => {
    const isClaim          = n.type === "claim_submitted";
    const isPaymentRequest = n.type === "payment_request";
    const iconId = n.metadata?.claimId || n.metadata?.paymentId || n._id;
    const iconColor = NOTIF_COLORS[n.type] || COLORS.primary;
    // Action ID used to check resolved state
    const actionId  = isPaymentRequest ? n.metadata?.paymentId : n.metadata?.claimId;
    // Show action buttons as long as this request hasn't been resolved in this session
    const isActionable = (isClaim || isPaymentRequest) && !resolved.has(actionId);

    return (
      <View style={{ marginBottom: SPACING.md }}>
        <TouchableOpacity
          onPress={() => !isActionable && markRead(n._id)}
          activeOpacity={isActionable ? 1 : 0.85}
          style={{
            backgroundColor: "#ffffff",
            padding: SPACING.xl, borderRadius: RADIUS.xl,
            flexDirection: "row", alignItems: "flex-start", gap: SPACING.md,
            opacity: n.read && !isActionable ? 0.65 : 1,
            ...SHADOWS.card,
          }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: !n.read || isActionable ? `${iconColor}22` : "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MaterialIcons name={NOTIF_ICONS[n.type] || "notifications"} size={22} color={!n.read || isActionable ? iconColor : COLORS.onSurfaceVariant} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontWeight: "600", color: COLORS.onSurface, fontSize: 15, flex: 1 }}>{n.title}</Text>
              <Text style={{ fontSize: 10, color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2, marginLeft: 8 }}>
                {timeAgo(n.createdAt)}
              </Text>
            </View>
            <Text style={{ color: COLORS.onSurfaceVariant, fontSize: 13, lineHeight: 20 }}>{n.message}</Text>

            {/* Approve / Reject buttons — shown for any unresolved payment/claim request */}
            {isActionable && (
              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => handleAction(actionId, "reject", n.type)}
                  style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#EF4444" }}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction(actionId, "approve", n.type)}
                  style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: "#D9F99D", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#064E3B" }}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {!n.read && !isActionable && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: iconColor, marginTop: 6, flexShrink: 0 }} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar 
        title="Alerts" 
        showBack={false} 
        rightElement={
          unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={{ marginRight: 8 }}>
              <MaterialIcons name="done-all" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          )
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryContainer} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginTop: SPACING.md, marginBottom: SPACING.xxl }}>
          <Text style={{ fontSize: 44, fontWeight: "900", color: COLORS.onSurface, letterSpacing: -2, lineHeight: 48, marginBottom: 8 }}>
            Recent{"\n"}<Text style={{ color: COLORS.primaryContainer }}>Activity</Text>
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1, color: COLORS.onSurfaceVariant }}>
            {unreadCount} New Notification{unreadCount !== 1 ? "s" : ""}
          </Text>
        </View>

        {loading ? (
          <Spinner />
        ) : notifs.length === 0 ? (
          <EmptyState icon="notifications-none" title="All quiet here" subtitle="You'll see expense updates and reminders here." />
        ) : (
          <>
            {todayNotifs.map((n) => <NotifItem key={n._id} n={n} />)}
            {olderNotifs.length > 0 && (
              <>
                <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.5, marginTop: SPACING.xl, marginBottom: SPACING.md }}>
                  Earlier
                </Text>
                {olderNotifs.map((n) => <NotifItem key={n._id} n={n} />)}
              </>
            )}
          </>
        )}

        {/* Smart suggestion card */}
        {owedSummary.totalOwed > 0 && (
          <View style={{ marginTop: SPACING.xl, backgroundColor: "#064E3B", borderRadius: RADIUS.xl, padding: SPACING.xl, overflow: "hidden", ...SHADOWS.card }}>
            {/* Star Icons for decoration */}
            <MaterialIcons name="auto-awesome" size={24} color="#D9F99D" style={{ position: "absolute", top: 16, right: 16, opacity: 0.3 }} />
            <MaterialIcons name="auto-awesome" size={48} color="#D9F99D" style={{ position: "absolute", bottom: -12, right: 32, opacity: 0.15 }} />
            <MaterialIcons name="auto-awesome" size={16} color="#D9F99D" style={{ position: "absolute", top: 48, right: 64, opacity: 0.2 }} />

            <Text style={{ fontSize: 10, fontWeight: "700", color: "#D9F99D", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, opacity: 0.8 }}>
              Smart Suggestion
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "white", marginBottom: 20, lineHeight: 32, letterSpacing: -0.8 }}>
              Looks like you're owed {formatCurrency(owedSummary.totalOwed)} across {owedSummary.groupCount} {owedSummary.groupCount === 1 ? 'group' : 'groups'}.
            </Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const res = await execute(() => paymentService.remindAll());
                  Alert.alert("Reminders Sent", `Sent payment reminders to ${res.reminded} members across all your groups.`);
                } catch (err) {
                  Alert.alert("Error", "Could not send reminders.");
                }
              }}
              activeOpacity={0.85}
              style={{ backgroundColor: "#D9F99D", paddingHorizontal: 24, paddingVertical: 14, borderRadius: RADIUS.lg, alignSelf: "flex-start", ...SHADOWS.primary }}
            >
              <Text style={{ fontWeight: "800", color: "#064E3B", fontSize: 15, textAlign: "center" }}>Send Reminders</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}