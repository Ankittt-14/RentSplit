import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { expenseService } from "../services";
import { Avatar, Badge, Button, Spinner } from "../components/ui";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS, CATEGORY_ICONS } from "../utils/theme";
import { formatCurrency, formatDate } from "../utils/helpers";

export default function ExpenseDetailScreen({ route, navigation }) {
  const { expenseId } = route.params;
  const insets        = useSafeAreaInsets();
  const { user }      = useAuth();
  const { execute }   = useApi();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await execute(() => expenseService.getOne(expenseId));
        // Compute myShare and mySettled from splits array
        const mySplit = (data.splits || []).find(
          s => (s.user?._id || s.user)?.toString() === user?._id?.toString()
        );
        setExpense({
          ...data,
          myShare: mySplit?.amountOwed || 0,
          mySettled: mySplit?.hasPaid || false,
        });
        setEditAmount(data.amount ? data.amount.toString() : "");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [expenseId]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Expense",
      "This is permanent and will remove the balance from all participants.",
      [
        { text: "Cancel",  style: "cancel" },
        { text: "Delete",  style: "destructive", onPress: async () => {
          try {
            await execute(() => expenseService.delete(expenseId));
            navigation.goBack();
          } catch {
            Alert.alert("Error", "Could not delete expense.");
          }
        }},
      ]
    );
  };

  const saveEdit = async () => {
    const num = Number(editAmount);
    if (!editAmount || isNaN(num) || num <= 0) return Alert.alert("Invalid", "Please enter a valid positive number.");
    setSaving(true);
    try {
      const updated = await execute(() => expenseService.update(expense._id, { amount: num }));
      setExpense(updated);
      setIsEditing(false);
      Alert.alert("Success", "Expense updated. Splits reflect the new amount.");
    } catch {
      Alert.alert("Error", "Could not update.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !saving) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
        <TopBar title="Expense Details" />
        <Spinner />
      </View>
    );
  }

  if (!expense) return null;

  const isAdmin = expense.group?.admin === user?._id;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar title="Expense Details" />
      <ScrollView
        contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <View style={{ alignItems: "center", marginBottom: SPACING.xxl }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.primaryContainer, paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, marginBottom: 16 }}>
            <MaterialIcons name={CATEGORY_ICONS[expense.category] || "receipt-long"} size={16} color={COLORS.primary} />
            <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, color: COLORS.primary }}>
              {expense.category}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: COLORS.onSurface, letterSpacing: -0.5, marginBottom: 8, textAlign: "center" }}>
            {expense.description}
          </Text>
          
          {isEditing ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 8 }}>
              <Text style={{ fontSize: 32, fontWeight: "700", color: COLORS.primary }}>₹</Text>
              <TextInput
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="numeric"
                autoFocus
                style={{ fontSize: 44, fontWeight: "900", color: COLORS.onSurface, borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 4, minWidth: 100, textAlign: "center" }}
              />
            </View>
          ) : (
            <Text style={{ fontSize: 52, fontWeight: "900", color: COLORS.primary, letterSpacing: -2 }}>
              {formatCurrency(expense.amount)}
            </Text>
          )}

          <Text style={{ color: COLORS.onSurfaceVariant, marginTop: 8, fontSize: 14 }}>
            Paid by <Text style={{ fontWeight: "700", color: COLORS.primary }}>{expense.paidBy?.name}</Text>
          </Text>
          <Text style={{ color: COLORS.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>
            {formatDate(expense.createdAt)}
          </Text>
          
          {isEditing && (
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <Button title="Cancel" variant="ghost" onPress={() => setIsEditing(false)} style={{ paddingVertical: 12 }} />
              <Button title="Save Changes" onPress={saveEdit} loading={saving} style={{ paddingVertical: 12 }} />
            </View>
          )}
        </View>

        {/* Stats grid */}
        <View style={{ flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.xl }}>
          <View style={{ flex: 1, backgroundColor: "#ffffff", padding: SPACING.lg, borderRadius: RADIUS.lg, ...SHADOWS.card }}>
            <Text style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: COLORS.onSurfaceVariant, marginBottom: 8 }}>My Share</Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.primary, letterSpacing: -0.5 }}>
              {formatCurrency(expense.myShare || 0)}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#ffffff", padding: SPACING.lg, borderRadius: RADIUS.lg, ...SHADOWS.card }}>
            <Text style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: COLORS.onSurfaceVariant, marginBottom: 8 }}>Status</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialIcons
                name={expense.mySettled ? "check-circle" : "schedule"}
                size={16}
                color={expense.mySettled ? COLORS.primary : COLORS.error}
              />
              <Text style={{ fontSize: 14, fontWeight: "600", color: expense.mySettled ? COLORS.primary : COLORS.error }}>
                {expense.mySettled ? "Settled" : "Pending"}
              </Text>
            </View>
          </View>
        </View>

        {/* Receipt image */}
        {expense.image && (
          <View style={{ marginBottom: SPACING.xl }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.onSurface, marginBottom: SPACING.md }}>Receipt</Text>
            <View style={{ borderRadius: RADIUS.xl, overflow: "hidden", aspectRatio: 4 / 3 }}>
              <Image source={{ uri: expense.image }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
            </View>
          </View>
        )}

        {/* Split breakdown */}
        <View style={{ marginBottom: SPACING.xl }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.onSurface, marginBottom: SPACING.md }}>Split Breakdown</Text>
          <View style={{ gap: SPACING.md }}>
            {/* Payer row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(0,0,0,0.03)", borderRadius: RADIUS.lg, padding: SPACING.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar name={expense.paidBy?.name} size={40} color={COLORS.primaryContainer} />
                <View>
                  <Text style={{ fontWeight: "700", color: COLORS.onSurface, fontSize: 14 }}>{expense.paidBy?.name}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 }}>Paid full amount</Text>
                </View>
              </View>
              <Text style={{ fontWeight: "700", color: COLORS.primary }}>{formatCurrency(expense.amount)}</Text>
            </View>

            {/* Each split */}
            {(expense.splits || []).map((s) => {
              const u = s.user || {};
              return (
              <View key={u._id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#ffffff", borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.card }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Avatar name={u.name} size={40} />
                  <View>
                    <Text style={{ fontWeight: "600", color: COLORS.onSurface, fontSize: 14 }}>{u.name}</Text>
                    <Text style={{ fontSize: 10, color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {s.hasPaid ? "Settled" : `Owes ${expense.paidBy?.name}`}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontWeight: "700", color: COLORS.primary }}>{formatCurrency(s.amountOwed || 0)}</Text>
                  {s.hasPaid && <Badge label="Paid" variant="success" />}
                </View>
              </View>
            )})}
          </View>
        </View>

        {/* Edit & Delete — Payer or Admin */}
        {(isAdmin || expense.paidBy?._id === user?._id) && !isEditing && (
          <View style={{ paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", gap: SPACING.md }}>
            <Button title="Edit Amount" icon="edit" variant="outline" onPress={() => setIsEditing(true)} />
            <Button title="Delete Expense" icon="delete" variant="danger" onPress={handleDelete} />
            <Text style={{ textAlign: "center", fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 12, lineHeight: 18, paddingHorizontal: 16 }}>
              This action is permanent and will remove the balance from all participants' ledgers.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}