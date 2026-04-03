import React, { useEffect, useState } from "react";
import { StatusBar, View } from "react-native";
import * as ExpoSplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from "./src/screens/SplashScreen";

// Keep the native splash screen visible while fonts load
ExpoSplashScreen.preventAutoHideAsync();

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      ExpoSplashScreen.hideAsync();
      setAppReady(true);
    }
  }, [fontsLoaded, fontError]);

  if (!appReady) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          {showSplash ? (
            <SplashScreen onAnimationFinish={() => setShowSplash(false)} />
          ) : (
            <AppNavigator />
          )}
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}