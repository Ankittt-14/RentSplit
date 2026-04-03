import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Share } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "../hooks/useApi";
import { groupService } from "../services";
import { Input, Button } from "../components/ui";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";

const GROUP_TYPES = [
  { label: "PG / Flat", icon: "home" },
  { label: "Trip",      icon: "flight-takeoff" },
  { label: "Office",    icon: "work" },
  { label: "Other",     icon: "more-horiz" },
];

export default function CreateGroupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { loading, execute } = useApi();
  const [name,       setName]       = useState("");
  const [groupType,  setGroupType]  = useState("PG / Flat");
  const [inviteCode, setInviteCode] = useState(null);
  const [createdId,  setCreatedId]  = useState(null);

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert("Missing field", "Please enter a group name.");
    try {
      const data = await execute(() => groupService.create({ name: name.trim(), type: groupType }));
      setInviteCode(data.inviteCode);
      setCreatedId(data._id);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Could not create group.");
    }
  };

  const handleShare = async () => {
    await Share.share({
      message: `Join my RentSplit group "${name}"!\nUse invite code: ${inviteCode}`,
      title: "RentSplit Invite",
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar title="Create Group" />
      <ScrollView
        contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page heading */}
        <View style={{ marginBottom: SPACING.xxl }}>
          <Text style={{ fontSize: 10, color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1, fontWeight: "500" }}>
            Step 01 of 02
          </Text>
          <Text style={{ fontSize: 44, fontWeight: "900", color: COLORS.primary, letterSpacing: -2, lineHeight: 48, marginTop: 8, marginBottom: 8 }}>
            New Ledger.
          </Text>
          <Text style={{ color: COLORS.onSurfaceVariant, fontSize: 14, lineHeight: 22 }}>
            Organize your shared expenses with an authoritative ledger for your household or trip.
          </Text>
        </View>

        <View style={{ backgroundColor: "#ffffff", borderRadius: RADIUS.lg, padding: SPACING.xl, gap: SPACING.xxl, ...SHADOWS.card }}>
          {/* Group name */}
          <View style={{ borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Group Name
            </Text>
            <Input
              placeholder="The Penthouse"
              value={name}
              onChangeText={setName}
              style={{ backgroundColor: "transparent" }}
            />
          </View>

          {/* Group type */}
          <View>
            <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1, marginBottom: SPACING.md }}>
              Purpose
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.md }}>
              {GROUP_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.label}
                  onPress={() => setGroupType(t.label)}
                  activeOpacity={0.8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: groupType === t.label ? COLORS.primaryContainer : "rgba(0,0,0,0.04)", minWidth: "45%" }}
                >
                  <MaterialIcons name={t.icon} size={18} color={groupType === t.label ? COLORS.primary : COLORS.onSurfaceVariant} />
                  <Text style={{ fontSize: 14, fontWeight: "500", color: groupType === t.label ? COLORS.primary : COLORS.onSurfaceVariant }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Create button OR success state */}
          {!inviteCode ? (
            <Button title="Initialize Ledger" icon="rocket-launch" onPress={handleCreate} loading={loading} />
          ) : (
            <>
              <Button
                title="Go to Group"
                icon="arrow-forward"
                onPress={() => navigation.replace("GroupDetail", { groupId: createdId, groupName: name })}
              />

              {/* Invite code card */}
              <View style={{ backgroundColor: COLORS.secondary, borderRadius: RADIUS.lg, padding: SPACING.xxl, alignItems: "center", overflow: "hidden" }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, opacity: 0.7 }}>
                  Share Invite Code
                </Text>
                <Text style={{ fontSize: 48, fontWeight: "900", letterSpacing: -2, color: COLORS.primary, marginBottom: 16 }}>
                  {inviteCode}
                </Text>
                <TouchableOpacity
                  onPress={handleShare}
                  activeOpacity={0.8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.full }}
                >
                  <MaterialIcons name="share" size={16} color="#ffffff" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#ffffff", textTransform: "uppercase", letterSpacing: 1 }}>
                    Share Code
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 10, color: COLORS.primary, opacity: 0.6, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 }}>
                  Valid for 24 hours
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}