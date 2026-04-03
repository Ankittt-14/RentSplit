import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, StatusBar, Text, Dimensions, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function SplashScreen({ onAnimationFinish }) {
  // Logo animations
  const logoScale   = useRef(new Animated.Value(0)).current;
  const logoRotate  = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  
  // Ring animations
  const ring1Scale   = useRef(new Animated.Value(0.5)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale   = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale   = useRef(new Animated.Value(0.5)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;
  
  // Brand text
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide   = useRef(new Animated.Value(20)).current;
  
  // Glow pulse
  const glowScale   = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  
  // Exit
  const exitFade = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // === PHASE 1: Logo Entrance (0ms - 800ms) ===
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 15,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // === PHASE 2: Expanding Rings (300ms stagger) ===
    const createRingAnim = (scale, opacity, delay) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.6, duration: 400, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
        ]),
      ]);
    };

    // Staggered ring explosions
    Animated.loop(
      Animated.stagger(400, [
        createRingAnim(ring1Scale, ring1Opacity, 0),
        createRingAnim(ring2Scale, ring2Opacity, 0),
        createRingAnim(ring3Scale, ring3Opacity, 0),
      ])
    ).start();

    // Reset ring scales for loop
    ring1Scale.addListener(({ value }) => { if (value >= 0.99) ring1Scale.setValue(0.5); });
    ring2Scale.addListener(({ value }) => { if (value >= 0.99) ring2Scale.setValue(0.5); });
    ring3Scale.addListener(({ value }) => { if (value >= 0.99) ring3Scale.setValue(0.5); });

    // === PHASE 3: Brand Text (600ms) ===
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    // === PHASE 4: Background Glow Pulse ===
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(glowOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.2, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 0.8, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // === PHASE 5: Exit (after 3s) ===
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(exitFade, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(exitScale, { toValue: 1.15, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => {
        if (onAnimationFinish) onAnimationFinish();
      });
    }, 3200);

    return () => {
      clearTimeout(exitTimer);
      ring1Scale.removeAllListeners();
      ring2Scale.removeAllListeners();
      ring3Scale.removeAllListeners();
    };
  }, []);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: exitFade, transform: [{ scale: exitScale }] }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Deep Background */}
      <LinearGradient 
        colors={["#000000", "#001a14", "#064e3b"]} 
        style={StyleSheet.absoluteFill}
      />

      {/* Pulsing Background Glow */}
      <Animated.View style={[styles.bgGlow, { 
        opacity: glowOpacity, 
        transform: [{ scale: glowScale }] 
      }]} />

      {/* Expanding Ripple Rings */}
      <Animated.View style={[styles.ring, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />
      <Animated.View style={[styles.ring, styles.ring2, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
      <Animated.View style={[styles.ring, styles.ring3, { opacity: ring3Opacity, transform: [{ scale: ring3Scale }] }]} />

      {/* Main Logo */}
      <Animated.View style={[styles.logoWrapper, { 
        opacity: logoOpacity, 
        transform: [{ scale: logoScale }, { rotate: spin }] 
      }]}>
        <LinearGradient
          colors={["#ceee93", "#a8e6a3", "#b0f0d6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoBox}
        >
          <Text style={styles.logoText}>RS</Text>
        </LinearGradient>
      </Animated.View>

      {/* Brand Name */}
      <Animated.View style={[styles.brandRow, { 
        opacity: textOpacity, 
        transform: [{ translateY: textSlide }] 
      }]}>
        <Text style={styles.brandText}>RENT</Text>
        <Text style={[styles.brandText, styles.brandAccent]}>SPLIT</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: textOpacity }]}>
        Smart Expense Sharing
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  bgGlow: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: "rgba(6,78,59,0.4)",
  },
  ring: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#ceee93",
  },
  ring2: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderColor: "#b0f0d6",
  },
  ring3: {
    width: 360,
    height: 360,
    borderRadius: 180,
    borderColor: "rgba(206,238,147,0.3)",
  },
  logoWrapper: {
    marginBottom: 24,
    // Subtle shadow glow
    shadowColor: "#ceee93",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 54,
    fontWeight: "900",
    color: "#003527",
    letterSpacing: -3,
    includeFontPadding: false,
  },
  brandRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  brandText: {
    fontSize: 18,
    fontWeight: "900",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 6,
  },
  brandAccent: {
    color: "#ceee93",
  },
  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "500",
    letterSpacing: 2,
  },
});