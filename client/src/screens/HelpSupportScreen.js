import { View, Text, ScrollView, TouchableOpacity, Linking, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";

const FAQS = [
  { q: "How do I split an expense?", a: "Navigate to a group, tap the '+' button, enter amount and description. RentSplit handles the rest!" },
  { q: "What is a 'Trust Score'?", a: "A rating based on how quickly you settle your debts. Higher scores unlock more features!" },
  { q: "How to settle up?", a: "Go to 'Settle Up' tab in your group, select a member and mark your payment as recorded." },
];

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar title="Help & Support" />
      <ScrollView
        contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", paddingVertical: SPACING.xxl }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryContainer, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <MaterialIcons name="support-agent" size={44} color={COLORS.primary} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.primary, textAlign: "center" }}>How can we help?</Text>
          <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: "center", marginTop: 4 }}>We are here to help you 24/7</Text>
        </View>

        <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.primary, marginBottom: 16 }}>Popular Questions</Text>
        <View style={{ gap: 12, marginBottom: 32 }}>
          {FAQS.map((faq, i) => (
            <View key={i} style={{ backgroundColor: "#ffffff", borderRadius: RADIUS.xl, padding: 20, ...SHADOWS.card }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.onSurface, marginBottom: 8 }}>{faq.q}</Text>
              <Text style={{ fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 20 }}>{faq.a}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.primary, marginBottom: 12 }}>Contact Us</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:pvtankit7858@gmail.com')}
            style={{ flex: 1, backgroundColor: COLORS.primaryContainer, borderRadius: RADIUS.xl, padding: 20, alignItems: "center", gap: 8 }}
          >
            <MaterialIcons name="email" size={24} color={COLORS.primary} />
            <Text style={{ fontWeight: "700", color: COLORS.primary }}>Email Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://www.linkedin.com/in/ankit-raj-73274a197/')}
            style={{ flex: 1, backgroundColor: COLORS.secondary, borderRadius: RADIUS.xl, padding: 20, alignItems: "center", gap: 8 }}
          >
            <MaterialIcons name="person" size={24} color={COLORS.primary} />
            <Text style={{ fontWeight: "700", color: COLORS.primary }}>LinkedIn</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
