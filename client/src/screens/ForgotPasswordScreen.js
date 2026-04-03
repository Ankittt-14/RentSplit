import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Field, Btn } from "../components/ui";
import { C, S, R, SH } from "../utils/theme";
import api from "../services/api";

export default function ForgotPasswordScreen({ navigation }) {
  const ins = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRequestOTP = async () => {
    if (!email.trim() || !email.includes("@")) {
      return Alert.alert("Invalid email", "Please enter a valid email address.");
    }
    
    try {
      setBusy(true);
      const { data } = await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      Alert.alert("OTP Sent", data.message);
      navigation.navigate("ResetPassword", { email: email.trim().toLowerCase() });
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to request password reset.");
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
            Forgot Password
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "500", color: C.textSub, lineHeight: 20 }}>
            Enter your email to receive a secure 6-digit verification code.
          </Text>
        </View>

        <View style={{ backgroundColor: C.white, borderRadius: R.xl, padding: S.xl, ...SH.green, shadowOpacity: 0.1, shadowRadius: 24, borderWidth: 1, borderColor: `${C.border}30` }}>
          <View style={{ gap: 20, marginBottom: 32, marginTop: 8 }}>
            <Field
              label="Email Address"
              placeholder="name@domain.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Btn label="Send Verification Code" icon="send" onPress={handleRequestOTP} loading={busy}/>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
