import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, StyleSheet, StatusBar } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "../hooks/useApi";
import { groupService } from "../services";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";

export default function JoinGroupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { execute, loading } = useApi();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef([]);

  const handleInput = (text, index) => {
    const val = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);

    // Auto-focus next input
    if (val && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleJoin = async () => {
    const inviteCode = code.join("");
    if (inviteCode.length < 6) return Alert.alert("Invalid Code", "Please enter the full 6-digit code.");

    try {
      const data = await execute(() => groupService.join(inviteCode));
      Alert.alert("Success!", `You have joined ${data.group?.name || "the group"}.`, [
        { text: "OK", onPress: () => navigation.navigate("Dashboard") }
      ]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Invalid invite code.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, paddingBottom: 100 }}>
          <Text style={styles.title}>Join a Group</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit invitation code sent by your roommate to get started.
          </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => (inputs.current[i] = ref)}
                style={[styles.codeInput, digit ? { borderColor: "#D9F99D", borderWidth: 2 } : {}]}
                value={digit}
                onChangeText={(text) => handleInput(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                maxLength={1}
                keyboardType="default"
                autoCapitalize="characters"
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.joinButton, loading && { opacity: 0.7 }]} 
            onPress={handleJoin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.joinButtonText}>{loading ? "Joining..." : "Join Group"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.requestButton}>
            <Text style={styles.requestButtonText}>REQUEST NEW CODE</Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <MaterialIcons name="info" size={18} color="#064E3B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.infoTitle}>Already in a group?</Text>
              <Text style={styles.infoSubtitle}>
                Joining a new group will archive your previous expense history for "Rent Split".
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "900",
    color: "#064E3B", // Dark green
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 48,
    paddingHorizontal: 10,
  },
  codeContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 48,
  },
  codeInput: {
    width: 50,
    height: 64,
    backgroundColor: "white",
    borderRadius: 25,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: "#064E3B",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...SHADOWS.card,
  },
  joinButton: {
    backgroundColor: "#D9F99D", // Lime green
    width: "100%",
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.primary,
    marginBottom: 24,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#064E3B",
  },
  requestButton: {
    marginBottom: 48,
  },
  requestButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 20,
    borderRadius: 24,
    width: "100%",
    alignItems: "center",
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
});