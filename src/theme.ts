// "Night map" design tokens (specs/lasso-frontend.md section 5.1).
// Every colour, size and font in the app comes from here.

export const color = {
  bg: "#07070A", bgRaised: "#0E0E13", surface: "#15151C", elevated: "#1E1E28",
  border: "#2A2A36", borderStrong: "#3A3A4A",
  text: "#F5F5F7", textMuted: "#A0A0AE", textFaint: "#6B6B7A",
  accent: "#C6FF3D", accentDim: "#8FB82C", onAccent: "#0A0A0A",
  danger: "#FF3B5C", reward: "#FFC83D", info: "#3D9BFF", success: "#3DDC84",
  glass: "rgba(21,21,28,0.72)", scrim: "rgba(0,0,0,0.6)",
} as const;

// The six player colours offered on Join, in this order.
export const playerColors = ["#3D7BFF", "#FF4D5E", "#9B5CFF", "#FF8A3D", "#2ED3E6", "#FF5CC8"] as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const glow = (hex: string) => ({
  shadowColor: hex, shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12,
});

export const font = {
  display: "SpaceGrotesk_700Bold", displaySemi: "SpaceGrotesk_600SemiBold",
  body: "Inter_400Regular", bodyMedium: "Inter_500Medium", bodySemi: "Inter_600SemiBold",
} as const;

export const type = {
  hero:       { fontFamily: font.display,     fontSize: 44, lineHeight: 48 },
  title1:     { fontFamily: font.display,     fontSize: 28, lineHeight: 34 },
  title2:     { fontFamily: font.displaySemi, fontSize: 22, lineHeight: 28 },
  body:       { fontFamily: font.body,        fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: font.bodySemi,    fontSize: 17, lineHeight: 24 },
  callout:    { fontFamily: font.bodyMedium,  fontSize: 15, lineHeight: 20 },
  caption:    { fontFamily: font.bodyMedium,  fontSize: 13, lineHeight: 16 },
  overline:   { fontFamily: font.bodySemi,    fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase" as const },
} as const;

// Component sizes used by the section 5.2 components.
export const size = {
  buttonLarge: 56, buttonMedium: 44, pill: 28, playerDot: 12, icon: 24, iconStroke: 2,
  swatch: 48, emptyIcon: 64, shopPin: 36, hairline: 1, ring: 3, edge: 3,
  sheetMax: 420, nameMax: 16,
} as const;

export const motion = { press: 90, toast: 3000 } as const;
export const opacity = { disabled: 0.4, pressedScale: 0.97 } as const;
export const blur = { intensity: 40, tint: "dark" } as const;
