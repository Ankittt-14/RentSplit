import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator, Image
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOWS } from "../../utils/theme";

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ title, onPress, variant = "primary", loading = false, disabled = false, icon, style }) {
  const variants = {
    primary: { 
      bg: COLORS.primary, 
      text: "#ffffff", 
      ...SHADOWS.primary 
    },
    accent:  { 
      bg: COLORS.secondary, 
      text: COLORS.onSecondary, 
      ...SHADOWS.primary 
    },
    ghost:   { 
      bg: "transparent", 
      text: COLORS.onSurfaceVariant,
      borderWidth: 1, 
      borderColor: COLORS.outline 
    },
    danger:  { 
      bg: "transparent", 
      text: COLORS.error,
      borderWidth: 2, 
      borderColor: `${COLORS.error}25` 
    },
    outline: { 
      bg: "transparent", 
      text: COLORS.primary,
      borderWidth: 1, 
      borderColor: COLORS.primary 
    },
  };
  const s = variants[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[{
        backgroundColor: s.bg,
        paddingVertical: 18,
        borderRadius: RADIUS.xl,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: disabled ? 0.5 : 1,
        borderWidth: s.borderWidth || 0,
        borderColor: s.borderColor || "transparent",
        ...s
      }, style]}
    >
      {loading
        ? <ActivityIndicator color={s.text} size="small" />
        : <>
            {icon && <MaterialIcons name={icon} size={20} color={s.text} />}
            <Text style={{ color: s.text, fontSize: 16, fontWeight: "700", letterSpacing: -0.3 }}>
              {title}
            </Text>
          </>
      }
    </TouchableOpacity>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, style, ...props }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label && (
        <Text style={{ fontSize: 10, fontWeight: "600", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.2 }}>
          {label}
        </Text>
      )}
      <TextInput
        style={{
          backgroundColor: "#ffffff",
          borderRadius: RADIUS.lg,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md + 2,
          fontSize: 15,
          color: COLORS.onSurface,
          fontWeight: "500",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.05)",
        }}
        placeholderTextColor={COLORS.outline}
        {...props}
      />
      {error && <Text style={{ fontSize: 12, color: COLORS.error }}>{error}</Text>}
    </View>
  );
}

// ── Underline Input (auth screens) ────────────────────────────────────────────
export function UnderlineInput({ label, error, style, ...props }) {
  return (
    <View style={[{ borderBottomWidth: 2, borderBottomColor: COLORS.primaryContainer, paddingBottom: 8 }, style]}>
      {label && (
        <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
          {label}
        </Text>
      )}
      <TextInput
        style={{ fontSize: 17, fontWeight: "600", color: COLORS.onSurface, padding: 0 }}
        placeholderTextColor={COLORS.outline}
        {...props}
      />
      {error && <Text style={{ fontSize: 12, color: COLORS.error, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress }) {
  const s = {
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  };
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[s, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[s, style]}>{children}</View>;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name = "", size = 40, color = COLORS.primaryContainer, photo }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={{ color: COLORS.primary, fontSize: size * 0.36, fontWeight: "700" }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, variant = "default" }) {
  const variants = {
    default: { bg: "rgba(0,0,0,0.05)",  text: COLORS.onSurfaceVariant },
    success: { bg: "rgba(0,106,80,0.08)", text: COLORS.primary },
    primary: { bg: COLORS.primaryContainer, text: COLORS.primary },
    error:   { bg: "rgba(186,26,26,0.1)",   text: COLORS.error },
  };
  const s = variants[variant];
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full }}>
      <Text style={{ color: s.text, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </Text>
    </View>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ color = COLORS.primary }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 }}>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, children }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 64, paddingHorizontal: 32, gap: 16 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name={icon} size={28} color={COLORS.outline} />
      </View>
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.onSurface }}>{title}</Text>
        {subtitle && (
          <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: "center", lineHeight: 22 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {children && <View style={{ width: "100%", marginTop: SPACING.md }}>{children}</View>}
    </View>
  );
}

// ── User Aliases ──────────────────────────────────────────────────────────────
export const Btn = Button;

export function Field({ label, error, right, style, ...props }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label && (
        <Text style={{ fontSize: 10, fontWeight: "600", color: COLORS.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.2 }}>
          {label}
        </Text>
      )}
      <View style={{ position: "relative", justifyContent: "center" }}>
        <TextInput
          style={{
            backgroundColor: "#ffffff",
            borderRadius: RADIUS.lg,
            paddingHorizontal: SPACING.lg,
            paddingVertical: SPACING.md + 2,
            fontSize: 15,
            color: COLORS.onSurface,
            fontWeight: "500",
            paddingRight: right ? 48 : SPACING.lg,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.04)",
          }}
          placeholderTextColor={COLORS.outline}
          {...props}
        />
        {right && (
          <View style={{ position: "absolute", right: SPACING.lg }}>
            {right}
          </View>
        )}
      </View>
      {error && <Text style={{ fontSize: 12, color: COLORS.error }}>{error}</Text>}
    </View>
  );
}