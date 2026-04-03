import { View, Text, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../utils/theme";

import DashboardScreen     from "../screens/DashboardScreen";
import GroupDetailScreen   from "../screens/GroupDetailScreen";
import CreateGroupScreen   from "../screens/CreateGroupScreen";
import AddExpenseScreen    from "../screens/AddExpenseScreen";
import ExpenseDetailScreen from "../screens/ExpenseDetailScreen";
import MonthlyReportScreen from "../screens/MonthlyReportScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen       from "../screens/ProfileScreen";
import EditProfileScreen  from "../screens/EditProfileScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import HelpSupportScreen  from "../screens/HelpSupportScreen";
import JoinGroupScreen     from "../screens/JoinGroupScreen";
import ClaimsScreen        from "../screens/ClaimsScreen";

import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/ui";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard"     component={DashboardScreen}     />
      <Stack.Screen name="GroupDetail"   component={GroupDetailScreen}   />
      <Stack.Screen name="CreateGroup"   component={CreateGroupScreen}   />
      <Stack.Screen name="AddExpense"    component={AddExpenseScreen}    />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} />
      <Stack.Screen name="Claims"        component={ClaimsScreen}        />
      <Stack.Screen name="JoinGroup"     component={JoinGroupScreen}     />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain"   component={ProfileScreen}       />
      <Stack.Screen name="EditProfile"   component={EditProfileScreen}   />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="HelpSupport"   component={HelpSupportScreen}   />
    </Stack.Navigator>
  );
}

function TabIcon({ name, label, focused, showBadge, photo, userName }) {
  return (
    <View style={{
      alignItems: "center", justifyContent: "center",
      paddingHorizontal: 20, paddingVertical: 8,
      borderRadius: focused ? RADIUS.xl : 0,
      backgroundColor: focused ? COLORS.primaryContainer : "transparent",
      minWidth: 70,
    }}>
      {photo !== undefined ? (
        <Avatar name={userName} photo={photo} size={22} color={focused ? COLORS.primary : "#94a3b8"} />
      ) : (
        <MaterialIcons
          name={name}
          size={22}
          color={focused ? COLORS.primary : "#94a3b8"}
        />
      )}
      <Text style={{
        fontSize: 10, fontWeight: "600",
        letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4,
        color: focused ? COLORS.primary : "#94a3b8",
      }}>
        {label}
      </Text>
      {showBadge && (
        <View style={{ 
          position: "absolute", top: 8, right: 18, 
          width: 10, height: 10, borderRadius: 5, 
          backgroundColor: COLORS.error, 
          borderWidth: 2, borderColor: COLORS.surface 
        }} />
      )}
    </View>
  );
}

export default function MainNavigator() {
  const { user } = useAuth();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.glassNav,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 0,
          height: Platform.OS === "android" ? 70 : 88,
          paddingBottom: Platform.OS === "android" ? 8 : 24,
          paddingTop: 8,
          elevation: 20,
          shadowColor: "#191c1e",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 24,
          position: "absolute",
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" label="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="notifications" label="Alerts" focused={focused} showBadge={true} /> }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ 
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              name="person" 
              label="Profile" 
              focused={focused} 
              photo={user?.profilePhoto} 
              userName={user?.name || "User"}
            />
          ) 
        }}
      />
    </Tab.Navigator>
  );
}