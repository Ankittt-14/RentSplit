import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Field, Btn } from "../components/ui";
import { C, S, R, SH } from "../utils/theme";
import api from "../services/api";

export default function ResetPasswordScreen({ navigation, route }) {
  const ins = useSafeAreaInsets();
  const { email } = route.params || {};
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleResetPassword = async () => {
    if (!otp || otp.length < 6) return Alert.alert("Invalid OTP", "Please enter the 6-digit code.");
    if (!newPassword || newPassword.length < 6) return Alert.alert("Weak Password", "Password must be at least 6 characters.");

    try {
      setBusy(true);
      await api.post("/auth/reset-password", { email, otp, newPassword });
      Alert.alert("Success", "Your password has been reset successfully.", [
        { text: "Login Now", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (e) {
      Alert.alert("Reset failed", e.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      
      <LinearGradient 
        colors={[`${C.primary}15`, `${C.surface}00`]} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 250 }} 
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: ins.top + 20, paddingHorizontal: S.xl, paddingBottom: 48 }} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: C.white, borderRadius: R.full, ...SH.card }}>
            <MaterialIcons name="arrow-back" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: S.sm, marginBottom: 32 }}>
          <Text style={{ fontSize: 34, fontWeight: "900", color: C.primary, letterSpacing: -1.5, marginBottom: 8 }}>
            Reset Password
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "500", color: C.textSub, lineHeight: 20 }}>
            Enter the 6-digit code and your new secure password.
          </Text>
        </View>

        <View style={{ backgroundColor: C.white, borderRadius: R.xl, padding: S.xl, ...SH.green, shadowOpacity: 0.1, shadowRadius: 24, borderWidth: 1, borderColor: `${C.border}30` }}>
          <View style={{ gap: 20, marginBottom: 32, marginTop: 8 }}>
            <Field
              label="Verification Code (6-digit)"
              placeholder="000 000"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
            />
            <Field
              label="New Password"
              placeholder="••••••••"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!show}
              right={
                <TouchableOpacity onPress={() => setShow(!show)} style={{ padding: 4 }}>
                  <MaterialIcons name={show ? "visibility" : "visibility-off"} size={20} color={C.textSub}/>
                </TouchableOpacity>
              }
            />
            <Btn label="Reset Password Securely" icon="lock-reset" onPress={handleResetPassword} loading={busy}/>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
