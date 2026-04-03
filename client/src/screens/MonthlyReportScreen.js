import { View, Text, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PieChart, BarChart } from "react-native-chart-kit";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";
import { formatCurrency } from "../utils/helpers";

const SCREEN_W = Dimensions.get("window").width;
const CHART_W  = SCREEN_W - SPACING.xl * 2 - SPACING.xl * 2; // full width minus outer + inner padding

const CHART_CFG = {
  backgroundGradientFrom: COLORS.surfaceContainerLowest,
  backgroundGradientTo:   COLORS.surfaceContainerLowest,
  color: (o = 1) => `rgba(6,78,59,${o})`,
  labelColor: () => COLORS.onSurfaceVariant,
  strokeWidth: 2,
  barPercentage: 0.55,
  decimalPlaces: 0,
  propsForBackgroundLines: { strokeDasharray: "", stroke: `${COLORS.outlineVariant}40`, strokeWidth: 0.5 },
};

// Sample data — replace with real API calls in Step 5
const CATEGORIES = [
  { name: "Rent",      amount: 30000, color: COLORS.primaryContainer, legendFontColor: COLORS.onSurfaceVariant, legendFontSize: 12 },
  { name: "Utilities", amount: 9800,  color: COLORS.secondaryFixed,   legendFontColor: COLORS.onSurfaceVariant, legendFontSize: 12 },
  { name: "Groceries", amount: 5200,  color: "#4edea3",               legendFontColor: COLORS.onSurfaceVariant, legendFontSize: 12 },
  { name: "Other",     amount: 3205,  color: COLORS.outlineVariant,   legendFontColor: COLORS.onSurfaceVariant, legendFontSize: 12 },
];

const MEMBERS = {
  labels: ["Ankit", "Rahul", "Priya", "Amit"],
  datasets: [{ data: [21000, 18505, 8700, 4000] }],
};

export default function MonthlyReportScreen({ route }) {
  const insets = useSafeAreaInsets();
  const total  = CATEGORIES.reduce((s, c) => s + c.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar title="Monthly Report" />
      <ScrollView
        contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month selector */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: SPACING.lg }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1, color: COLORS.onSurfaceVariant }}>
              Selected Period
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.primary }}>October 2024</Text>
          </View>
          <TouchableOpacity style={{ padding: 10, borderRadius: 99, backgroundColor: COLORS.surfaceContainerLow }}>
            <MaterialIcons name="calendar-today" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero total */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryContainer]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: RADIUS.xl, padding: SPACING.xxl, marginBottom: SPACING.xl, ...SHADOWS.primary }}
        >
          <Text style={{ fontSize: 10, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1.2, color: COLORS.primaryFixedDim, opacity: 0.8, marginBottom: 4 }}>
            Total Spent
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.primaryFixedDim }}>₹</Text>
            <Text style={{ fontSize: 52, fontWeight: "900", color: "white", letterSpacing: -2, lineHeight: 56 }}>
              {total.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, alignSelf: "flex-start", marginTop: SPACING.lg }}>
            <MaterialIcons name="trending-up" size={14} color={COLORS.secondaryFixed} />
            <Text style={{ fontSize: 12, fontWeight: "500", color: "white" }}>12% more than September</Text>
          </View>
        </LinearGradient>

        {/* Pie chart */}
        <View style={{ backgroundColor: COLORS.surfaceContainerLowest, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, ...SHADOWS.card }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.onSurface, marginBottom: SPACING.lg }}>
            Category Breakdown
          </Text>
          <PieChart
            data={CATEGORIES}
            width={CHART_W}
            height={180}
            chartConfig={CHART_CFG}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="8"
          />
        </View>

        {/* Bar chart */}
        <View style={{ backgroundColor: COLORS.surfaceContainerLowest, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, ...SHADOWS.card }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.onSurface, marginBottom: SPACING.lg }}>
            Member Contributions
          </Text>
          <BarChart
            data={MEMBERS}
            width={CHART_W}
            height={200}
            chartConfig={CHART_CFG}
            fromZero
            showValuesOnTopOfBars
            style={{ borderRadius: RADIUS.lg }}
          />
        </View>

        {/* Download PDF */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={{ backgroundColor: COLORS.primaryContainer, paddingVertical: 18, borderRadius: RADIUS.xl, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, ...SHADOWS.primary }}
        >
          <MaterialIcons name="download" size={20} color={COLORS.primaryFixed} />
          <Text style={{ fontWeight: "700", color: COLORS.primaryFixed, fontSize: 16, letterSpacing: -0.3 }}>
            Download PDF
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}