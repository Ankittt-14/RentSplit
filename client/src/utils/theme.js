export const COLORS = {
  primary:                 "#006a50",
  primaryContainer:        "#9cf4d2",
  primaryFixed:            "#006a50",
  onPrimary:               "#ffffff",
  onPrimaryContainer:      "#002117",
  secondary:               "#ceee93",
  onSecondary:             "#131f00",
  surface:                 "#f7f9fb",
  surfaceVariant:          "#ffffff",
  onSurface:               "#191c1e",
  onSurfaceVariant:        "#5c6d64",
  outline:                 "#bfc9c3",
  outlineVariant:          "rgba(0,106,80,0.05)",
  accent:                  "#006a50",
  error:                   "#ba1a1a",
  glassNav:                "rgba(247,249,251,0.92)",
};

export const FONTS = {
  regular:   "Inter_400Regular",
  medium:    "Inter_500Medium",
  semiBold:  "Inter_600SemiBold",
  bold:      "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
  black:     "Inter_900Black",
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 999,
};

export const SHADOWS = {
  card: {
    shadowColor: "#191c1e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  primary: {
    shadowColor: "#006a50",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const CATEGORY_ICONS = {
  Rent:        "home",
  Groceries:   "shopping-basket",
  Electricity: "bolt",
  WiFi:        "wifi",
  Water:       "water-drop",
  Maid:        "cleaning-services",
  Milk:        "local-cafe",
  Other:       "receipt-long",
};

export const CATEGORIES = Object.keys(CATEGORY_ICONS);