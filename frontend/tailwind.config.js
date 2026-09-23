/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // High-tech Electric Indigo brand palette (Primary)
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
          950: "#1E1B4B",
        },
        // Deep obsidian slate for typography, buttons & dark surfaces
        ink: {
          DEFAULT: "#0F172A",
          soft: "#1E293B",
          mute: "#64748B",
        },
        // Electric Cyan & Vivid Aqua accent palette
        citrus: {
          50: "#ECFEFF",
          100: "#CFFAFE",
          200: "#A5F3FC",
          300: "#67E8F9",
          400: "#06B6D4",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
        },
        // Pristine Slate & Ice neutrals (replacing dull yellowish cream)
        cream: {
          50: "#FFFFFF",
          100: "#F8FAFC",
          200: "#F1F5F9",
          300: "#E2E8F0",
          400: "#CBD5E1",
          500: "#94A3B8",
        },
        // Primary & secondary aliases
        primary: "#4F46E5",
        secondary: "#06B6D4",
        accent: "#06B6D4",
        obsidian: {
          900: "#0F172A",
          950: "#090D16",
          card: "#111827",
          elevated: "#162032",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.75rem",
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgba(15, 23, 42, 0.04), 0 16px 36px -16px rgba(15, 23, 42, 0.08)",
        lift: "0 24px 60px -15px rgba(15, 23, 42, 0.16), 0 0 1px 1px rgba(99, 102, 241, 0.08)",
        citrus: "0 12px 32px -10px rgba(6, 182, 212, 0.5)",
        indigo: "0 12px 32px -10px rgba(79, 70, 229, 0.5)",
        glow: "0 0 35px -5px rgba(99, 102, 241, 0.35)",
        ring: "inset 0 0 0 1px rgba(15, 23, 42, 0.06)",
      },
      backgroundImage: {
        "grid-light":
          "radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.06) 1px, transparent 0)",
        "grid-dark":
          "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.06) 1px, transparent 0)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-16px) rotate(1deg)" },
          "66%": { transform: "translateY(8px) rotate(-1deg)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        float: "float 9s ease-in-out infinite",
        "float-slow": "float 14s ease-in-out 1.5s infinite",
        marquee: "marquee 26s linear infinite",
      },
    },
  },
  plugins: [],
};
