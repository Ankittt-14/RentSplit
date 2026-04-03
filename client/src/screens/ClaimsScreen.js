import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useApi } from "../hooks/useApi";
import { claimService, groupService } from "../services";
import { Button, Input, EmptyState, Spinner, Avatar, Badge } from "../components/ui";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS, CATEGORIES, CATEGORY_ICONS } from "../utils/theme";
import { formatCurrency, formatDate } from "../utils/helpers";
import { useAuth } from "../context/AuthContext";

export default function ClaimsScreen({ route, navigation }) {
  const groupIdFromParams = route.params?.groupId;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { loading, execute } = useApi();

  const [activeTab, setActiveTab] = useState("Pending"); // "Pending", "History", "New"
  const [claims,    setClaims]    = useState([]);
  const [group,     setGroup]     = useState(null);
  const [groups,    setGroups]    = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(groupIdFromParams);

  // New Claim Form State
  const [amount,      setAmount]      = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("Other");

  const isLeader = group?.leader?._id === user?._id || group?.leader === user?._id;

  const loadData = async () => {
    try {
      if (!selectedGroupId) {
        const allGroups = await execute(() => groupService.getAll());
        setGroups(allGroups || []);
        if (allGroups && allGroups.length > 0) {
          setSelectedGroupId(allGroups[0]._id);
        }
        return;
      }

      const gRes = await execute(() => groupService.getOne(selectedGroupId));
      setGroup(gRes.group || gRes);
      
      const cRes = await execute(() => claimService.getAll(selectedGroupId));
      setClaims(cRes || []);
    } catch (err) {
      console.log("Error loading claims:", err);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [selectedGroupId]));

  const handleSubmit = async () => {
    if (!amount || !description) return Alert.alert("Missing fields", "Please enter amount and description.");
    if (isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert("Invalid amount", "Please enter a valid amount.");

    try {
      await execute(() => claimService.create({ groupId: selectedGroupId, amount: Number(amount), category, description }));
      Alert.alert("Submitted", "Your claim has been sent to the leader for approval.");
      setAmount("");
      setDescription("");
      setActiveTab("Pending");
      loadData();
    } catch (err) {
      Alert.alert("Error", "Could not submit claim.");
    }
  };

  const handleAction = async (claimId, action) => {
    try {
      if (action === "approve") await execute(() => claimService.approve(claimId));
      else await execute(() => claimService.reject(claimId));
      
      Alert.alert("Success", `Claim ${action}d successfully.`, [{ text: "OK", onPress: loadData }]);
    } catch (err) {
      Alert.alert("Error", `Could not ${action} claim.`);
    }
  };

  const pendingClaims = claims.filter(c => c.status === "pending");
  const historyClaims = claims.filter(c => c.status !== "pending");

  if (!selectedGroupId && groups.length === 0 && !loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
        <TopBar title="Approvals" showBack={false} />
        <EmptyState icon="group-off" title="No Groups Found" subtitle="Join a group to see and submit claims." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar 
        title={group?.name || "Approvals"} 
        showBack={!!groupIdFromParams}
        rightComponent={isLeader ? <Badge label="LEADER" variant="primary" /> : null}
      />
      
      <ScrollView 
        contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl, paddingBottom: 140 }} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 42, fontWeight: "900", color: "#064E3B", letterSpacing: -1.5, marginBottom: 8 }}>
          Pending Approvals
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.onSurfaceVariant, lineHeight: 22, marginBottom: 32 }}>
          Review additional expenses submitted by collective members for the current cycle.
        </Text>

        {loading && claims.length === 0 ? (
          <Spinner />
        ) : pendingClaims.length === 0 && activeTab === "Pending" ? (
          <EmptyState icon="done-all" title="All caught up!" subtitle="There are no pending claims for approval." />
        ) : (
          pendingClaims.map(c => {
            const memberCount = group?.members?.length || 1;
            const impact = c.amount / memberCount;
            
            return (
              <View key={c._id} style={{ backgroundColor: "white", borderRadius: 32, padding: 24, marginBottom: 20, ...SHADOWS.card }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Avatar name={c.submittedBy?.name} size={48} />
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#1F2937", textTransform: "uppercase" }}>{c.submittedBy?.name}</Text>
                      <Text style={{ fontSize: 13, color: "#6B7280" }}>{c.description}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: "900", color: "#111827" }}>{formatCurrency(c.amount)}</Text>
                </View>

                <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
                  {/* Receipt Preview */}
                  <View style={{ width: 80, height: 100, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" }}>
                    {c.image ? (
                      <Image source={{ uri: c.image }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                    ) : (
                      <MaterialIcons name="receipt" size={32} color="#9CA3AF" />
                    )}
                  </View>

                  <View style={{ flex: 1, backgroundColor: "#F3F4F6", borderRadius: 20, padding: 16, flexDirection: "row", gap: 12 }}>
                    <MaterialIcons name="info" size={20} color="#10B981" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: "#10B981", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Impact Preview</Text>
                      <Text style={{ fontSize: 13, color: "#374151", lineHeight: 18 }}>
                        This will add <Text style={{ fontWeight: "700" }}>{formatCurrency(impact)}</Text> to each member's share.
                      </Text>
                    </View>
                  </View>
                </View>

                {isLeader && (
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity 
                      onPress={() => handleAction(c._id, "reject")}
                      style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: "#E5E7EB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                    >
                      <MaterialIcons name="close" size={20} color="#EF4444" />
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937" }}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleAction(c._id, "approve")}
                      style={{ flex: 1.2, height: 56, borderRadius: 28, backgroundColor: "#D9F99D", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                    >
                      <MaterialIcons name="check" size={20} color="#064E3B" />
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "#064E3B" }}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        {!isLeader && (
          <Button 
            title="Submit New Claim" 
            variant="accent" 
            icon="add" 
            onPress={() => setActiveTab("New")} 
            style={{ marginTop: 20 }}
          />
        )}
      </ScrollView>

      {/* New Claim Modal or View could go here, but for now I'll use the existing tab logic if needed */}
    </View>
  );
}
