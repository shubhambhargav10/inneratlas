import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#FAF8F5",
          subtle: "#F4EFEA",
          muted: "#EDE7DF",
          pure: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#121826",
          light: "#2A3447",
          muted: "#5B677E",
          faint: "#8D99AE",
        },
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          deep: "#241A5C",
        },
        accent: {
          gold: "#D97706",
          emerald: "#059669",
          coral: "#E11D48",
          sky: "#0284C7",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(18, 24, 38, 0.05), 0 4px 6px -2px rgba(18, 24, 38, 0.02)",
        lifted: "0 10px 25px -5px rgba(18, 24, 38, 0.08), 0 8px 10px -6px rgba(18, 24, 38, 0.04)",
        glow: "0 0 25px -5px rgba(99, 102, 241, 0.25)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
