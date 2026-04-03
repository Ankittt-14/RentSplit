import { useState } from "react";
import { 
  View, Text, ScrollView, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, StatusBar, StyleSheet
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { Field } from "../components/ui";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";

export default function LoginScreen({ navigation }) {
  const insets     = useSafeAreaInsets();
  const { login }  = useAuth();
  
  const [email,    setEmail]   = useState("");
  const [pass,     setPass]    = useState("");
  const [show,     setShow]    = useState(false);
  const [busy,     setBusy]    = useState(false);

  const go = async () => {
    if (!email.trim() || !pass) return Alert.alert("Missing fields", "Please enter your email and password.");
    try {
      setBusy(true);
      await login(email.trim().toLowerCase(), pass);
    } catch (e) {
      Alert.alert("Login failed", e.response?.data?.message || "Invalid email or password.");
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Hyper-Premium Header with Light Emerald Aurora */}
      <View style={{ height: 280, backgroundColor: COLORS.primary, overflow: 'hidden' }}>
        <View style={[styles.glowOrb, { backgroundColor: COLORS.primaryContainer, top: -50, left: -50 }]} />
        <View style={[styles.glowOrb, { backgroundColor: COLORS.secondary, bottom: -50, right: -50, width: 250, height: 250 }]} />
        
        <LinearGradient 
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)', COLORS.surface]} 
          style={{ flex: 1, paddingHorizontal: SPACING.xl, paddingTop: insets.top + 20 }}
        >
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={{ marginTop: 40 }}>
            <Text style={styles.headerTitle}>
              Welcome <Text style={{ color: COLORS.secondary }}>Back</Text>
            </Text>
            <View style={styles.accentLine} />
            <Text style={styles.headerSubtitle}>
              Sign in to manage your sovereign ledger.
            </Text>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
          style={styles.formContainer}
          contentContainerStyle={{ padding: SPACING.xl, paddingBottom: 100 }}
        >
          <View style={{ gap: 24, marginTop: 12 }}>
            <Field
              label="Email Address"
              placeholder="name@domain.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View>
              <Field
                label="Password"
                placeholder="••••••••"
                value={pass}
                onChangeText={setPass}
                secureTextEntry={!show}
                right={
                  <TouchableOpacity onPress={()=>setShow(!show)} style={{ padding: 4 }}>
                    <MaterialIcons name={show?"visibility":"visibility-off"} size={20} color={COLORS.onSurfaceVariant}/>
                  </TouchableOpacity>
                }
              />
              <TouchableOpacity 
                style={{ alignSelf: "flex-end", marginTop: 12 }}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.primary }}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={go}
              disabled={busy}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#006a50", "#004d3a"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.submitBtn}
              >
                {busy ? <Text style={styles.submitText}>Loading...</Text> : (
                  <>
                    <MaterialIcons name="login" size={20} color="#ffffff" />
                    <Text style={styles.submitText}>Login Securely</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12 }}>
              <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant }}>New to RentSplit? </Text>
              <TouchableOpacity onPress={()=>navigation.navigate("Signup")}>
                <Text style={{ color: COLORS.primary, fontWeight: "800", fontSize: 14 }}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  glowOrb: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerTitle: {
    fontSize: 38,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1.5
  },
  accentLine: {
    width: 32,
    height: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 12
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    fontWeight: '500'
  },
  formContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32
  },
  submitBtn: {
    height: 60,
    borderRadius: RADIUS.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: 'row',
    gap: 10,
    elevation: 4,
  },
  submitText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff"
  }
});