import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF1538",
          600: "#E00F2F",
          700: "#B80B26",
          50: "#FFE9ED",
        },
        ink: {
          950: "#09090D",
          900: "#0C0C12",
          850: "#101018",
          800: "#14141C",
          700: "#1C1C26",
          600: "#2A2A36",
        },
        mist: {
          100: "#F4F5F7",
          200: "#E4E6EB",
          400: "#A0A4B0",
          500: "#7C8190",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        display: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.18), 0 12px 32px -18px rgba(0,0,0,.55)",
        glow: "0 0 0 1px rgba(255,21,56,.35), 0 18px 50px -20px rgba(255,21,56,.45)",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".35", transform: "scale(.75)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        ticker: "ticker 45s linear infinite",
        fadeUp: "fadeUp .45s ease-out both",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
        orbit: "orbit 22s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
