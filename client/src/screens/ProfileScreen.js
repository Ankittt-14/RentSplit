import { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, Modal, StyleSheet } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services";
import { useApi } from "../hooks/useApi";
import { Badge, Card } from "../components/ui";
import TopBar from "../components/layout/TopBar";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";

const SETTINGS = [
  { icon: "person-outline",        label: "Edit Profile",     target: "EditProfile"   },
  { icon: "lock-outline",          label: "Change Password",  target: "ChangePassword" },
  { icon: "notifications-none",    label: "Notifications",    target: "NotificationsTab" },
  { icon: "help-outline",          label: "Help & Support",   target: "HelpSupport"   },
];

export default function ProfileScreen() {
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation();
  const { user, logout, updateUser } = useAuth();
  const { execute } = useApi();
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ totalSplits: 0, trustScore: 95 });
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await execute(() => authService.getStats());
      if (res.data) setStats(res.data);
    } catch (err) {
      console.log("Failed to load stats", err);
    }
  }, [execute]);

  useFocusEffect(useCallback(() => {
    loadStats();
  }, [loadStats]));

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return Alert.alert("Permission Denied", "We need access to your gallery to upload photos.");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);
        const base64Photo = `data:image/jpeg;base64,${result.assets[0].base64}`;
        try {
          const res = await authService.updateProfile({ profilePhoto: base64Photo });
          updateUser(res.data.user);
        } catch (err) {
          Alert.alert("Error", "Failed to update profile photo.");
        } finally {
          setUploading(false);
        }
      }
    } catch (err) {
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  const removePhoto = async () => {
    try {
      setUploading(true);
      const res = await authService.updateProfile({ profilePhoto: "" });
      updateUser(res.data.user);
      setShowPhotoModal(false);
    } catch (err) {
      Alert.alert("Error", "Failed to remove photo.");
    } finally {
      setUploading(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const initials = (user?.name || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar title="Profile Settings" showBack={false} />
      <ScrollView
        contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile hero */}
        <View style={{ alignItems: "center", marginTop: SPACING.lg, marginBottom: SPACING.xxl }}>
          <TouchableOpacity 
            onPress={() => setShowPhotoModal(true)}
            activeOpacity={0.9}
            style={{ position: "relative", marginBottom: SPACING.lg }}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ width: 132, height: 132, borderRadius: 66, padding: 3 }}
            >
              <View style={{ flex: 1, borderRadius: 63, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: COLORS.surface, overflow: "hidden" }}>
                {user?.profilePhoto ? (
                  <Image source={{ uri: user.profilePhoto }} style={{ width: 120, height: 120, borderRadius: 60 }} />
                ) : (
                  <Text style={{ fontSize: 44, fontWeight: "900", color: COLORS.primary }}>{initials}</Text>
                )}
              </View>
            </LinearGradient>
            <View
              style={{ position: "absolute", bottom: 4, right: 4, backgroundColor: COLORS.primary, borderRadius: 99, padding: 8, ...SHADOWS.primary }}
            >
              <MaterialIcons name={uploading ? "hourglass-top" : "camera-alt"} size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <Text style={{ fontSize: 28, fontWeight: "900", color: COLORS.onSurface, letterSpacing: -1, marginBottom: 4 }}>
            {user?.name}
          </Text>
          <Text style={{ color: COLORS.onSurfaceVariant, fontWeight: "500", fontSize: 14, marginBottom: 12 }}>
            {user?.email}
          </Text>
          <Badge label="Premium Member" variant="success" />
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.xxl }}>
          <View style={{ flex: 1, padding: SPACING.xl, borderRadius: RADIUS.lg, backgroundColor: "#ffffff", justifyContent: "space-between", height: 120, ...SHADOWS.card }}>
            <MaterialIcons name="account-balance-wallet" size={24} color={COLORS.primary} />
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: COLORS.onSurfaceVariant }}>Total Split</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.primary, letterSpacing: -0.5 }}>₹{stats.totalSplits?.toLocaleString() || "0"}</Text>
            </View>
          </View>
          <View style={{ flex: 1, padding: SPACING.xl, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary, justifyContent: "space-between", height: 120, ...SHADOWS.primary }}>
            <MaterialIcons name="star" size={24} color={COLORS.secondary} />
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.7)" }}>Trust Score</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#ffffff", letterSpacing: -0.5 }}>{stats.trustScore || "95.0"}</Text>
            </View>
          </View>
        </View>

        {/* Settings list */}
        <View style={{ marginBottom: SPACING.xl }}>
          <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.onSurfaceVariant, marginBottom: SPACING.md, paddingHorizontal: 4 }}>
            Account Settings
          </Text>
          <View style={{ backgroundColor: "#ffffff", borderRadius: RADIUS.lg, overflow: "hidden", ...SHADOWS.card }}>
            {SETTINGS.map((s, i) => (
              <TouchableOpacity
                key={s.label}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(s.target)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.lg, borderBottomWidth: i < SETTINGS.length - 1 ? 1 : 0, borderBottomColor: "rgba(0,0,0,0.05)" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.03)", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name={s.icon} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={{ fontWeight: "600", color: COLORS.onSurface, fontSize: 15 }}>{s.label}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.outline} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <View style={{ paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" }}>
          <TouchableOpacity
            onPress={confirmLogout}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 }}
          >
            <MaterialIcons name="logout" size={20} color={COLORS.error} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.error }}>Logout Session</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: "center", paddingVertical: SPACING.xl, fontSize: 10, color: COLORS.outline, textTransform: "uppercase", letterSpacing: 1 }}>
          RentSplit v1.0.0 · Built by Ankit Raj
        </Text>
      </ScrollView>

      {/* Photo Management Modal */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseArea} 
            activeOpacity={1} 
            onPress={() => setShowPhotoModal(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile Photo</Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.imagePreviewContainer}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={{ width: 206, height: 206, borderRadius: 103, padding: 3 }}
              >
                <View style={{ flex: 1, borderRadius: 100, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {user?.profilePhoto ? (
                    <Image source={{ uri: user.profilePhoto }} style={{ width: 200, height: 200, borderRadius: 100 }} />
                  ) : (
                    <Text style={{ fontSize: 72, fontWeight: "900", color: COLORS.primary }}>{initials}</Text>
                  )}
                </View>
              </LinearGradient>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} 
                onPress={() => { setShowPhotoModal(false); setTimeout(pickImage, 500); }}
              >
                <MaterialIcons name="photo-library" size={20} color="#ffffff" />
                <Text style={[styles.modalBtnText, { color: "#ffffff" }]}>Update Photo</Text>
              </TouchableOpacity>

              {user?.profilePhoto && (
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: `${COLORS.error}10` }]} 
                  onPress={removePhoto}
                >
                  <MaterialIcons name="delete-outline" size={20} color={COLORS.error} />
                  <Text style={[styles.modalBtnText, { color: COLORS.error }]}>Remove Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseArea: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.onSurface,
  },
  imagePreviewContainer: {
    marginBottom: SPACING.xxl,
  },
  modalActions: {
    width: "100%",
    gap: 12,
  },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    gap: 10,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});