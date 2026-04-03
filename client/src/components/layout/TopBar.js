import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../ui";
import { COLORS, SPACING, RADIUS } from "../../utils/theme";

export default function TopBar({ title, showBack = true, rightComponent }) {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const { user }   = useAuth();

  return (
    <View style={{
      paddingTop: insets.top + 8,
      paddingBottom: 14,
      paddingHorizontal: SPACING.xl,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: COLORS.glassNav,
      position: "absolute",
      top: 0, left: 0, right: 0,
      zIndex: 100,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.05)",
    }}>
      {/* Left side */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{ 
              padding: 8, 
              borderRadius: RADIUS.full, 
              backgroundColor: "rgba(0,0,0,0.03)" 
            }}
          >
            <MaterialIcons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          /* Brand mark – RS monogram scaled down for bar */
          <LinearGradient
            colors={["#006a50", "#004d3a"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff", letterSpacing: -1 }}>RS</Text>
          </LinearGradient>
        )}

        <Text style={{
          fontSize: showBack ? 18 : 20,
          fontWeight: "800",
          color: COLORS.onSurface,
          letterSpacing: -0.6,
        }}>
          {title}
        </Text>
      </View>

      {/* Right side */}
      {rightComponent || (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!showBack && (
            <TouchableOpacity
              onPress={() => navigation.navigate("NotificationsTab")}
              activeOpacity={0.7}
              style={{
                width: 36, height: 36, borderRadius: RADIUS.full,
                backgroundColor: "rgba(0,0,0,0.03)",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <MaterialIcons name="notifications-none" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate("ProfileTab")}
            activeOpacity={0.8}
          >
            <Avatar name={user?.name || "A"} photo={user?.profilePhoto} size={36} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}