import React, { useRef, useEffect } from "react";
import { 
  View, Text, TouchableOpacity, Animated, Dimensions, StatusBar, StyleSheet, Easing
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";

const { width, height } = Dimensions.get("window");

const FEATURES = [
  { icon: "shield", label: "Secure" },
  { icon: "flash-on", label: "Fast" },
  { icon: "groups", label: "Fair" },
];

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  // Logo
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPulse   = useRef(new Animated.Value(1)).current;
  
  // Content
  const titleFade   = useRef(new Animated.Value(0)).current;
  const titleSlide  = useRef(new Animated.Value(30)).current;
  const subFade     = useRef(new Animated.Value(0)).current;
  const btnFade     = useRef(new Animated.Value(0)).current;
  const btnSlide    = useRef(new Animated.Value(40)).current;
  
  // Feature badges
  const feat1 = useRef(new Animated.Value(0)).current;
  const feat2 = useRef(new Animated.Value(0)).current;
  const feat3 = useRef(new Animated.Value(0)).current;
  const featAnims = [feat1, feat2, feat3];
  
  // Background glows
  const glow1Opacity = useRef(new Animated.Value(0.04)).current;
  const glow2Opacity = useRef(new Animated.Value(0.03)).current;

  useEffect(() => {
    // Background glow breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow1Opacity, { toValue: 0.1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow1Opacity, { toValue: 0.04, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow2Opacity, { toValue: 0.08, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow2Opacity, { toValue: 0.03, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Staggered entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 18, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(titleSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(subFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.stagger(120, featAnims.map(f =>
        Animated.spring(f, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true })
      )),
      Animated.parallel([
        Animated.timing(btnFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(btnSlide, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.05, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: COLORS.surface }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Hyper-Premium Light gradient */}
      <LinearGradient 
        colors={["#f7f9fb", "#ecf4f1", "#d8f2e7"]} 
        style={StyleSheet.absoluteFill}
      />

      {/* Breathing aurora glows (Light theme adapted) */}
      <Animated.View style={[styles.glowOrb, styles.glow1, { opacity: glow1Opacity, backgroundColor: "#9cf4d2" }]} />
      <Animated.View style={[styles.glowOrb, styles.glow2, { opacity: glow2Opacity, backgroundColor: "#006a50" }]} />

      <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: SPACING.xxl, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 30 }}>
        
        {/* ===== TOP: Logo Section ===== */}
        <Animated.View style={{ alignItems: 'center', opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Animated.View style={{ transform: [{ scale: logoPulse }], alignItems: 'center' }}>
            <View style={styles.outerRing} />
            
            <LinearGradient
              colors={["#006a50", "#004d3a"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.logoBox}
            >
              <Text style={styles.logoText}>RS</Text>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* ===== MIDDLE: Content ===== */}
        <View>
          <Animated.View style={{ opacity: titleFade, transform: [{ translateY: titleSlide }] }}>
            <Text style={styles.title}>
              Rent{'\n'}
              <Text style={{ color: "#006a50" }}>Split.</Text>
            </Text>
          </Animated.View>

          <Animated.View style={[styles.accentLine, { opacity: subFade }]} />

          <Animated.Text style={[styles.subtitle, { opacity: subFade }]}>
            Smart expense sharing for roommates, friends, and families. Fast, secure, transparent.
          </Animated.Text>

          <View style={styles.featureRow}>
            {FEATURES.map((f, i) => (
              <Animated.View key={f.label} style={[styles.featureBadge, { 
                opacity: featAnims[i], 
                transform: [{ scale: featAnims[i] }]
              }]}>
                <MaterialIcons name={f.icon} size={16} color="#006a50" />
                <Text style={styles.featureText}>{f.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* ===== BOTTOM: Buttons ===== */}
        <Animated.View style={{ opacity: btnFade, transform: [{ translateY: btnSlide }] }}>
          <TouchableOpacity 
            onPress={() => navigation.navigate("Signup")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#006a50", "#004d3a"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <MaterialIcons name="rocket-launch" size={20} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.7}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Already have an account? </Text>
            <Text style={[styles.secondaryBtnText, { color: "#006a50", fontWeight: "800" }]}>Sign In</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  glow1: {
    width: 400,
    height: 400,
    top: -100,
    right: -100,
  },
  glow2: {
    width: 350,
    height: 350,
    bottom: -50,
    left: -100,
  },
  outerRing: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: "rgba(0,106,80,0.06)",
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#006a50",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoText: {
    fontSize: 52,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -3,
    includeFontPadding: false,
  },
  title: {
    fontSize: 52,
    fontWeight: "900",
    color: "#191c1e",
    lineHeight: 56,
    letterSpacing: -2.5,
  },
  accentLine: {
    width: 36,
    height: 4,
    backgroundColor: "#006a50",
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#5c6d64",
    lineHeight: 24,
    fontWeight: "500",
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    gap: 10,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "rgba(0,106,80,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,106,80,0.08)",
  },
  featureText: {
    fontSize: 12,
    color: "#5c6d64",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  primaryBtn: {
    height: 64,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    elevation: 6,
    shadowColor: "#006a50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  primaryBtnText: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "900",
  },
  secondaryBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  secondaryBtnText: {
    fontSize: 15,
    color: "#5c6d64",
    fontWeight: "600",
  },
});
