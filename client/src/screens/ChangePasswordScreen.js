import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authService } from "../services";
import TopBar from "../components/layout/TopBar";
import { Button } from "../components/ui";
import CustomAlert from "../components/ui/CustomAlert";
import { COLORS, SPACING, RADIUS } from "../utils/theme";

export default function ChangePasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success",
    onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
  });

  const showAlert = (title, message, type = "success", onConfirm = null) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      }
    });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return showAlert("Error", "All fields are required.", "error");
    }
    if (newPassword !== confirmPassword) {
      return showAlert("Error", "New passwords do not match.", "error");
    }
    if (newPassword.length < 6) {
      return showAlert("Error", "New password must be at least 6 characters.", "error");
    }

    setLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      showAlert("Success", "Password updated successfully!", "success", () => {
          navigation.goBack();
      });
    } catch (error) {
      showAlert("Error", error.response?.data?.message || "Could not update password.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar title="Change Password" />
      <ScrollView
        contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.primary, marginBottom: 8, letterSpacing: -0.5 }}>
          Security
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: SPACING.xxl }}>
          Ensure your account stays safe with a strong password.
        </Text>

        <View style={{ gap: SPACING.lg }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.onSurfaceVariant, marginBottom: 8, marginLeft: 4, textTransform: "uppercase" }}>Current Password</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: `${COLORS.outlineVariant}30` }}>
              <MaterialIcons name="lock-open" size={20} color={COLORS.primaryFixed} style={{ marginRight: 12 }} />
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Your current password"
                placeholderTextColor={COLORS.outlineVariant}
                secureTextEntry={!showCurrent}
                style={{ flex: 1, color: COLORS.onSurface, fontSize: 16, fontWeight: "600" }}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <MaterialIcons name={showCurrent ? "visibility" : "visibility-off"} size={20} color={COLORS.outlineVariant} />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.onSurfaceVariant, marginBottom: 8, marginLeft: 4, textTransform: "uppercase" }}>New Password</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: `${COLORS.outlineVariant}30` }}>
              <MaterialIcons name="lock-outline" size={20} color={COLORS.primaryFixed} style={{ marginRight: 12 }} />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimal 6 characters"
                placeholderTextColor={COLORS.outlineVariant}
                secureTextEntry={!showNew}
                style={{ flex: 1, color: COLORS.onSurface, fontSize: 16, fontWeight: "600" }}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <MaterialIcons name={showNew ? "visibility" : "visibility-off"} size={20} color={COLORS.outlineVariant} />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.onSurfaceVariant, marginBottom: 8, marginLeft: 4, textTransform: "uppercase" }}>Confirm New Password</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: `${COLORS.outlineVariant}30` }}>
              <MaterialIcons name="verified-user" size={20} color={COLORS.primaryFixed} style={{ marginRight: 12 }} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your new password"
                placeholderTextColor={COLORS.outlineVariant}
                secureTextEntry={!showNew}
                style={{ flex: 1, color: COLORS.onSurface, fontSize: 16, fontWeight: "600" }}
              />
            </View>
          </View>
        </View>

        <Button
          title="Update Password"
          onPress={handleChangePassword}
          loading={loading}
          style={{ marginTop: SPACING.xxl * 1.5 }}
        />
      </ScrollView>

      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
    </View>
  );
}
