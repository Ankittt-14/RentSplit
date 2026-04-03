import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useApi } from "../hooks/useApi";
import { expenseService, groupService, claimService } from "../services";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/ui";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS, CATEGORIES, CATEGORY_ICONS } from "../utils/theme";

const SPLIT_TYPES = ["Equal", "Custom", "Exact %"];

export default function AddExpenseScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { loading, execute } = useApi();

  const [group,    setGroup]    = useState(null);
  const [members,   setMembers]   = useState([]);
  const [amount,    setAmount]    = useState("");
  const [title,     setTitle]     = useState("");
  const [category,  setCategory]  = useState("Other");
  const [splitType, setSplitType] = useState("Equal");
  const [image,     setImage]     = useState(null);
  const [base64,    setBase64]    = useState(null);

  const isLeader = group?.leader?._id === user?._id || group?.leader === user?._id;

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await execute(() => groupService.getOne(groupId));
        setGroup(data.group || data);
        setMembers(data.group?.members || data.members || []);
      } catch {}
    };
    loadData();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert("Permission Required", "We need access to your photos to upload receipts.");
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImage(asset.uri);
        if (asset.base64) {
          setBase64(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch (err) {
      Alert.alert("Error", `Could not open image library: ${err.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !title) return Alert.alert("Missing fields", "Please enter amount and title.");
    if (isNaN(Number(amount)) || Number(amount) <= 0) return Alert.alert("Invalid amount", "Please enter a valid amount.");

    try {
      if (isLeader) {
        // Calculate equal split
        const share = Number(amount) / (members.length || 1);
        const splits = members.map(m => ({ user: m._id, amountOwed: share }));

        await execute(() => expenseService.create({
          groupId,
          description: title.trim(),
          amount: Number(amount),
          category,
          splits,
          image: base64
        }));
        
        Alert.alert("Added!", `${title} has been added to ${groupName}.`, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        // Members submit claims
        await execute(() => claimService.create({
          groupId,
          description: title.trim(),
          amount: Number(amount),
          category,
          image: base64
        }));

        Alert.alert("Claim Submitted", "Your expense has been sent to the leader for approval.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Could not process request.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar title={isLeader ? "Add Expense" : "Submit Claim"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Big amount input */}
          <View style={{ borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 8, marginBottom: SPACING.xxl }}>
            <Text style={{ fontSize: 10, fontWeight: "500", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>
              Amount
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ fontSize: 32, fontWeight: "700", color: COLORS.primary }}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={COLORS.outline}
                style={{ flex: 1, fontSize: 56, fontWeight: "900", color: COLORS.onSurface, letterSpacing: -2, padding: 0 }}
              />
            </View>
          </View>

          {/* Title */}
          <Input
            label={isLeader ? "Expense Title" : "Claim Title"}
            placeholder={isLeader ? "e.g. Monthly Rent" : "e.g. Extra Uber"}
            value={title}
            onChangeText={setTitle}
            style={{ marginBottom: SPACING.lg }}
          />

          {/* Presets */}
          <Text style={{ fontSize: 10, fontWeight: "500", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: SPACING.sm }}>
            Quick Presets
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.xl }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { label: "Hotel (1k/day)", title: "Hotel per day", amount: "1000", cat: "Rent" },
                { label: "Food (1k/day)",  title: "Food per day",  amount: "1000", cat: "Groceries" },
                { label: "Transport",      title: "Transport",     amount: "500",  cat: "Other" },
                { label: "Dinner",         title: "Group Dinner",  amount: "3000", cat: "Groceries" },
              ].map((p, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setTitle(p.title);
                    setAmount(p.amount);
                    setCategory(p.cat);
                  }}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.lg, backgroundColor: "rgba(0,0,0,0.04)", borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.primary }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Category */}
          <Text style={{ fontSize: 10, fontWeight: "500", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: SPACING.md }}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.xl }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: category === cat ? COLORS.primaryContainer : "rgba(0,0,0,0.04)" }}
                >
                  <MaterialIcons name={CATEGORY_ICONS[cat]} size={16} color={category === cat ? COLORS.primary : COLORS.onSurfaceVariant} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: category === cat ? COLORS.primary : COLORS.onSurfaceVariant }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Paid By */}


          {/* Split type */}
          <Text style={{ fontSize: 10, fontWeight: "500", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: SPACING.md }}>
            Split Type
          </Text>
          <View style={{ flexDirection: "row", backgroundColor: "rgba(0,0,0,0.03)", borderRadius: RADIUS.xl, padding: 6, marginBottom: SPACING.xl }}>
            {SPLIT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setSplitType(t)}
                activeOpacity={0.8}
                style={{ flex: 1, paddingVertical: 12, borderRadius: RADIUS.lg, alignItems: "center", backgroundColor: splitType === t ? COLORS.primaryContainer : "transparent" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: splitType === t ? COLORS.primary : COLORS.onSurfaceVariant }}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Receipt */}

          {/* Receipt Image */}
          <Text style={{ fontSize: 10, fontWeight: "500", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: SPACING.md }}>Receipt Image</Text>
          <TouchableOpacity 
            onPress={pickImage}
            activeOpacity={0.8}
            style={{ 
              height: 160, borderRadius: RADIUS.xl, backgroundColor: "#ffffff", 
              borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(0,106,80,0.1)",
              alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: SPACING.xxl
            }}
          >
            {image ? (
              <View style={{ width: "100%", height: "100%" }}>
                <Image source={{ uri: image }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                <TouchableOpacity 
                  onPress={() => setImage(null)}
                  style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.5)", width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }}
                >
                  <MaterialIcons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ alignItems: "center", gap: 8 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="add-a-photo" size={24} color={COLORS.primary} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.onSurfaceVariant }}>Upload Receipt</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Sticky submit button */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(247,249,251,0.97)", padding: SPACING.xl, paddingBottom: SPACING.xl + insets.bottom }}>
          <Button title={isLeader ? "Add Expense" : "Submit Claim"} icon="chevron-right" onPress={handleSubmit} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}