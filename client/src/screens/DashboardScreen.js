import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { groupService } from "../services";
import { EmptyState, Spinner, Button } from "../components/ui";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";
import { formatCurrency } from "../utils/helpers";

// ── Helpers ──────────────────────────────────────────────────────────────────
const GROUP_TYPE_META = {
  Trip:   { icon: "flight",      grad: ["#6366f1", "#8b5cf6"] },
  Office: { icon: "work",        grad: ["#0ea5e9", "#38bdf8"] },
  Home:   { icon: "home",        grad: ["#10b981", "#34d399"] },
  Other:  { icon: "receipt-long",grad: ["#f59e0b", "#fbbf24"] },
};
const getTypeMeta = (type) => GROUP_TYPE_META[type] || GROUP_TYPE_META.Other;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Hero Card ─────────────────────────────────────────────────────────────────
function HeroCard({ user, totalOwed, totalOwe, groups }) {
  const netPositive = totalOwed >= totalOwe;
  const netAmount   = Math.abs(totalOwed - totalOwe);

  return (
    <LinearGradient
      colors={["#003527", "#064e3b", "#0a6b4b"]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ borderRadius: RADIUS.xl + 4, padding: SPACING.xl, marginBottom: SPACING.xl, overflow: "hidden" }}
    >
      {/* Decorative blobs */}
      <View style={{
        position: "absolute", top: -40, right: -40,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: "rgba(206,238,147,0.08)",
      }} />
      <View style={{
        position: "absolute", bottom: -30, left: -20,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: "rgba(49,201,143,0.06)",
      }} />

      {/* Greeting */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <MaterialIcons name="wb-sunny" size={13} color="rgba(255,255,255,0.45)" />
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" }}>
          {getGreeting()}, {user?.name?.split(" ")[0]}
        </Text>
      </View>

      {/* Net balance */}
      <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4, marginTop: 12 }}>
        Net Balance
      </Text>
      <Text style={{ fontSize: 44, fontWeight: "900", color: "#ffffff", letterSpacing: -2, lineHeight: 50 }}>
        {groups.length === 0 ? "₹0" : formatCurrency(netAmount)}
      </Text>
      {groups.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
          <MaterialIcons
            name={netPositive && totalOwed > 0 ? "trending-up" : totalOwe > 0 ? "trending-down" : "check-circle"}
            size={14}
            color={netPositive && totalOwed > 0 ? "#6ee7b7" : totalOwe > 0 ? "#fca5a5" : "#6ee7b7"}
          />
          <Text style={{ fontSize: 13, color: netPositive && totalOwed > 0 ? "#6ee7b7" : totalOwe > 0 ? "#fca5a5" : "#6ee7b7", fontWeight: "600" }}>
            {netPositive && totalOwed > 0
              ? `You're ahead by ${formatCurrency(netAmount)}`
              : totalOwe > 0
              ? `You owe ${formatCurrency(netAmount)} net`
              : "All balances settled"}
          </Text>
        </View>
      )}

      {/* Stat chips */}
      {groups.length > 0 && (
        <View style={{ flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg }}>
          <StatChip icon="arrow-downward" label="You are owed" amount={totalOwed} tint="#6ee7b7" />
          <StatChip icon="arrow-upward"   label="You owe"      amount={totalOwe}  tint="#fca5a5" />
        </View>
      )}

      {groups.length === 0 && (
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: SPACING.md, lineHeight: 20 }}>
          Join or create a group to start splitting expenses.
        </Text>
      )}
    </LinearGradient>
  );
}

function StatChip({ icon, label, amount, tint }) {
  return (
    <View style={{
      flex: 1, backgroundColor: "rgba(255,255,255,0.09)",
      borderRadius: RADIUS.lg, padding: SPACING.md,
      borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <MaterialIcons name={icon} size={12} color={tint} />
        <Text style={{ fontSize: 10, color: tint, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 17, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5 }}>
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, count }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.lg }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.onSurface, letterSpacing: -0.5 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: COLORS.surfaceContainerHigh, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.onSurfaceVariant }}>{count}</Text>
      </View>
    </View>
  );
}

// ── Group Card ─────────────────────────────────────────────────────────────────
function GroupCard({ group, onPress, onSettle }) {
  const isOwed    = group.myBalance > 0;
  const isOwe     = group.myBalance < 0;
  const isSettled = group.myBalance === 0;
  const meta      = getTypeMeta(group.type);

  const accentColor = isOwed ? "#10b981" : isOwe ? "#ef4444" : COLORS.outlineVariant;
  const progress    = group.totalSpent > 0
    ? Math.min(((group.settledAmount || 0) / group.totalSpent) * 100, 100)
    : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        backgroundColor: COLORS.surfaceContainerLowest,
        borderRadius: RADIUS.xl,
        marginBottom: SPACING.lg,
        overflow: "hidden",
        ...SHADOWS.card,
        // Left accent border
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
      }}
    >
      <View style={{ padding: SPACING.xl }}>
        {/* Card header */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: SPACING.md }}>
          {/* Group type avatar */}
          <LinearGradient
            colors={meta.grad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: 46, height: 46, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", marginRight: SPACING.md }}
          >
            <MaterialIcons name={meta.icon} size={22} color="#ffffff" />
          </LinearGradient>

          {/* Name & meta */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: COLORS.onSurface, letterSpacing: -0.4 }} numberOfLines={1}>
              {group.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              <MaterialIcons name="people" size={13} color={COLORS.onSurfaceVariant} />
              <Text style={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontWeight: "500" }}>
                {group.members?.length || 0} members
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.outlineVariant }}>·</Text>
              <Text style={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontWeight: "500" }}>{group.type}</Text>
            </View>
          </View>

          {/* Balance badge */}
          <View style={{
            backgroundColor: isOwed ? "#dcfce7" : isOwe ? "#fee2e2" : COLORS.surfaceContainerLow,
            borderRadius: RADIUS.full,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: isOwed ? "#15803d" : isOwe ? "#b91c1c" : COLORS.onSurfaceVariant }}>
              {isOwed ? "Owed" : isOwe ? "Owes" : "Settled"}
            </Text>
          </View>
        </View>

        {/* Balance amount */}
        <View style={{ marginBottom: group.totalSpent > 0 ? SPACING.md : 0 }}>
          <Text style={{ fontSize: 10, fontWeight: "600", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
            {isOwed ? "Owed to you" : isOwe ? "You owe" : "All settled up"}
          </Text>
          <Text style={{
            fontSize: 28, fontWeight: "900", letterSpacing: -1,
            color: isOwed ? "#10b981" : isOwe ? "#ef4444" : COLORS.onSurfaceVariant,
          }}>
            {isSettled ? "₹0" : formatCurrency(Math.abs(group.myBalance))}
          </Text>
        </View>

        {/* Progress bar */}
        {group.totalSpent > 0 && (
          <View style={{ marginBottom: isOwe ? SPACING.md : 0 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 10, color: COLORS.onSurfaceVariant, fontWeight: "500" }}>
                Settlement progress
              </Text>
              <Text style={{ fontSize: 10, color: COLORS.onSurfaceVariant, fontWeight: "700" }}>
                {Math.round(progress)}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: COLORS.surfaceContainerHighest, borderRadius: RADIUS.full, overflow: "hidden" }}>
              <LinearGradient
                colors={["#10b981", "#34d399"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ width: `${progress}%`, height: "100%", borderRadius: RADIUS.full }}
              />
            </View>
          </View>
        )}

        {/* Settle up CTA */}
        {isOwe && (
          <TouchableOpacity
            onPress={onSettle}
            activeOpacity={0.85}
            style={{
              paddingVertical: 13,
              borderRadius: RADIUS.lg,
              alignItems: "center",
              overflow: "hidden",
              marginTop: 2,
            }}
          >
            <LinearGradient
              colors={["#003527", "#064e3b"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: RADIUS.lg,
              }}
            />
            <Text style={{ fontWeight: "700", color: "#ceee93", fontSize: 14, letterSpacing: 0.2 }}>
              Settle Up →
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom accent stripe for owed-to-you */}
      {isOwed && (
        <View style={{ height: 3, backgroundColor: "#10b981" }} />
      )}
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const { loading, execute } = useApi();
  const [groups,     setGroups]     = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const data = await execute(() => groupService.getAll());
      setGroups(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadGroups(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const totalOwed = groups.reduce((s, g) => s + (g.myBalance > 0 ? g.myBalance : 0), 0);
  const totalOwe  = groups.reduce((s, g) => s + (g.myBalance < 0 ? Math.abs(g.myBalance) : 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <TopBar title="RentSplit" showBack={false} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: 88 + insets.top,
          paddingHorizontal: SPACING.xl,
          paddingBottom: 130,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryContainer} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <HeroCard user={user} totalOwed={totalOwed} totalOwe={totalOwe} groups={groups} />

        {/* Groups */}
        {loading && groups.length === 0 ? (
          <Spinner />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="group"
            title="No groups yet"
            subtitle="Create a group or enter an invite code to start splitting expenses."
          >
            <View style={{ gap: SPACING.md }}>
              <Button
                title="Join a Group"
                variant="accent"
                icon="person-add"
                onPress={() => navigation.navigate("JoinGroup")}
              />
              <Button
                title="Create Group"
                variant="outline"
                icon="add-box"
                onPress={() => navigation.navigate("CreateGroup")}
              />
            </View>
          </EmptyState>
        ) : (
          <>
            <SectionHeader title="Your Groups" count={groups.length} />
            {groups.map((group) => (
              <GroupCard
                key={group._id}
                group={group}
                onPress={() => navigation.navigate("GroupDetail", { groupId: group._id, groupName: group.name })}
                onSettle={() => navigation.navigate("GroupDetail", { groupId: group._id, groupName: group.name, defaultTab: "Settle Up" })}
              />
            ))}

            {/* Join group row */}
            <TouchableOpacity
              onPress={() => navigation.navigate("JoinGroup")}
              activeOpacity={0.8}
              style={{ marginTop: SPACING.md, borderRadius: RADIUS.xl, overflow: "hidden", ...SHADOWS.primary }}
            >
              <LinearGradient
                colors={["#ceee93", "#b0f0d6"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                <MaterialIcons name="person-add" size={20} color="#003527" />
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#003527", letterSpacing: -0.3 }}>
                  Join a Group
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => navigation.navigate("CreateGroup")}
        activeOpacity={0.85}
        style={{
          position: "absolute", bottom: 90, right: 24,
          borderRadius: RADIUS.xl,
          overflow: "hidden",
          ...SHADOWS.accent,
        }}
      >
        <LinearGradient
          colors={["#ceee93", "#b0f0d6"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="add" size={30} color="#003527" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
