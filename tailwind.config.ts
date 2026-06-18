import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        cream: {
          50: "#F0FDF4",
          100: "#DCFCE7",
        },
        // Primary palette — fresh emerald-leaning green (hue 142°, not yellow-tinted).
        // Token name "coral" kept for backwards-compat across components.
        coral: {
          50: "#BBF7D0",
          500: "#4ADE80",
          600: "#15803D",
        },
        mint: {
          50: "#E3F5F0",
          500: "#4FB7A1",
          600: "#3A9684",
        },
        ink: {
          200: "#E5DED6",
          500: "#7A6F66",
          700: "#4A413B",
          900: "#1F1A17",
        },
        danger: "#D9534F",
        warning: "#E8A33D",
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam-pro)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["var(--font-be-vietnam-pro)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-mobile": ["32px", { lineHeight: "1.1", fontWeight: "700" }],
        "display-tablet": ["40px", { lineHeight: "1.1", fontWeight: "700" }],
        "display-desktop": ["48px", { lineHeight: "1.1", fontWeight: "700" }],
      },
      borderRadius: {
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(31, 26, 23, 0.05)",
        md: "0 4px 12px -2px rgba(31, 26, 23, 0.08)",
        lg: "0 12px 24px -6px rgba(31, 26, 23, 0.12)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
