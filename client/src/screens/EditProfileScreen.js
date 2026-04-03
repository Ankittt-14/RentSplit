import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services";
import TopBar from "../components/layout/TopBar";
import { Button } from "../components/ui";
import CustomAlert from "../components/ui/CustomAlert";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../utils/theme";

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);
  const [loading, setLoading] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success",
    onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
  });

  const showAlert = (title, message, type = "success", onConfirm = null) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      }
    });
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permission Denied", "Camera roll access is needed to change your photo.", "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setProfilePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (err) {
      showAlert("Error", "Could not open image picker.", "error");
    }
  };

  const handleUpdate = async () => {
    if (!name.trim() || !email.trim()) {
      return showAlert("Error", "Name and email are required.", "error");
    }
    setLoading(true);
    try {
      const payload = { name, email };
      // Only send profilePhoto if it changed
      if (profilePhoto !== (user?.profilePhoto || null)) {
        payload.profilePhoto = profilePhoto;
      }
      const res = await authService.updateProfile(payload);
      updateUser(res.data.user);
      showAlert("Success", "Profile updated successfully!", "success", () => {
          navigation.goBack();
      });
    } catch (error) {
      showAlert("Error", error.response?.data?.message || "Could not update profile.", "error");
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.name || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopBar title="Edit Profile" />
      <ScrollView
        contentContainerStyle={{ paddingTop: 88 + insets.top, paddingHorizontal: SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo Section */}
        <View style={{ alignItems: "center", marginBottom: SPACING.xxl }}>
          <View style={{ position: "relative", marginBottom: SPACING.md }}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ width: 110, height: 110, borderRadius: 55, padding: 3 }}
            >
              <View style={{ flex: 1, borderRadius: 52, backgroundColor: COLORS.primaryContainer, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: COLORS.surface, overflow: "hidden" }}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                ) : (
                  <Text style={{ fontSize: 36, fontWeight: "900", color: COLORS.primary }}>{initials}</Text>
                )}
              </View>
            </LinearGradient>
            <TouchableOpacity
              onPress={pickImage}
              style={{ position: "absolute", bottom: 2, right: 2, backgroundColor: COLORS.primary, borderRadius: 99, padding: 8, ...SHADOWS.primary }}
            >
              <MaterialIcons name="camera-alt" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={pickImage}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.primary }}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.primary, marginBottom: 8, letterSpacing: -0.5 }}>
          Update Details
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: SPACING.xxl }}>
          Keep your professional profile up to date.
        </Text>

        <View style={{ gap: SPACING.lg }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.onSurfaceVariant, marginBottom: 8, marginLeft: 4, textTransform: "uppercase" }}>Full Name</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderRadius: RADIUS.lg, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}>
              <MaterialIcons name="person-outline" size={20} color={COLORS.primary} style={{ marginRight: 12 }} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your Name"
                placeholderTextColor={COLORS.outline}
                style={{ flex: 1, color: COLORS.onSurface, fontSize: 16, fontWeight: "600" }}
              />
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.onSurfaceVariant, marginBottom: 8, marginLeft: 4, textTransform: "uppercase" }}>Email Address</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderRadius: RADIUS.lg, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}>
              <MaterialIcons name="mail-outline" size={20} color={COLORS.primary} style={{ marginRight: 12 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email Address"
                placeholderTextColor={COLORS.outline}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ flex: 1, color: COLORS.onSurface, fontSize: 16, fontWeight: "600" }}
              />
            </View>
          </View>
        </View>

        <Button
          title="Save Changes"
          onPress={handleUpdate}
          loading={loading}
          style={{ marginTop: SPACING.xxl * 1.5 }}
        />
      </ScrollView>

      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
    </View>
  );
}
