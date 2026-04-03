import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import { COLORS } from "../utils/theme";

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surface }}>
        <ActivityIndicator size="large" color={COLORS.primaryContainer} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}