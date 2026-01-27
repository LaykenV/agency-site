/**
 * Brand colors matching the app's design system from globals.css
 * All colors use HSL format for consistency
 */

export const brandColors = {
  // Primary blue - main brand color
  primary: "hsl(215, 85%, 55%)",
  primaryDark: "hsl(215, 80%, 44%)",
  primaryDeep: "hsl(222, 72%, 28%)", // Hero foreground

  // Accent colors
  accent: "hsl(215, 56%, 92%)",
  accentDark: "hsl(215, 35%, 24%)",

  // Highlight/success green - for CTAs
  highlight: "hsl(150, 65%, 40%)",
  highlightBright: "hsl(150, 65%, 45%)",

  // Amber accent for glows
  amber: "hsl(43, 74%, 52%)",

  // Backgrounds
  background: {
    light: "hsl(225, 38%, 95%)",
    dark: "hsl(220, 28%, 11%)",
  },

  // Foreground/text colors
  foreground: {
    light: "hsl(225, 30%, 35%)",
    dark: "hsl(0, 0%, 100%)",
  },

  // Card surfaces
  card: {
    light: "hsl(225, 33%, 96%)",
    dark: "hsl(220, 28%, 12%)",
  },

  // Muted colors
  muted: {
    light: "hsl(225, 20%, 92%)",
    dark: "hsl(220, 16%, 16%)",
  },
  mutedForeground: {
    light: "hsl(225, 20%, 50%)",
    dark: "hsl(220, 12%, 72%)",
  },

  // Border colors
  border: {
    light: "hsl(230, 16%, 84%)",
    dark: "hsl(220, 12%, 18%)",
  },
} as const;

// Gradient definitions matching app design
export const gradients = {
  // Primary gradient for dark sections
  primaryDark: "linear-gradient(135deg, hsl(222, 72%, 28%) 0%, hsl(210, 50%, 20%) 100%)",

  // Hero gradient
  hero: "linear-gradient(135deg, hsl(215, 85%, 55%) 0%, hsl(220, 70%, 35%) 100%)",

  // Card surface gradient
  cardSurface: (theme: "light" | "dark") =>
    theme === "light"
      ? "linear-gradient(180deg, hsl(225, 33%, 96%) 0%, hsl(225, 24%, 94%) 100%)"
      : "linear-gradient(180deg, hsl(220, 28%, 14%) 0%, hsl(220, 28%, 12%) 100%)",

  // CTA button gradient
  cta: "linear-gradient(180deg, hsl(150, 65%, 45%) 0%, hsl(150, 65%, 38%) 100%)",

  // Radial glow
  primaryGlow: (opacity: number = 0.25) =>
    `radial-gradient(circle, hsl(215, 85%, 55%, ${opacity}), transparent 70%)`,

  accentGlow: (opacity: number = 0.2) =>
    `radial-gradient(circle, hsl(215, 56%, 92%, ${opacity}), transparent 70%)`,

  highlightGlow: (opacity: number = 0.3) =>
    `radial-gradient(circle, hsl(150, 65%, 40%, ${opacity}), transparent 60%)`,
} as const;

// Theme-aware color getter
export const getThemeColors = (theme: "light" | "dark") => ({
  background: brandColors.background[theme],
  foreground: brandColors.foreground[theme],
  card: brandColors.card[theme],
  muted: brandColors.muted[theme],
  mutedForeground: brandColors.mutedForeground[theme],
  border: brandColors.border[theme],
  primary: theme === "light" ? brandColors.primary : brandColors.primaryDark,
});

export type Theme = "light" | "dark";
