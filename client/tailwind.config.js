
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Base
        bg: "#ffffff",
        surface: "#fdf8f0",        // warm cream
        "surface-2": "#faf0e0",     // deeper cream
        border: "#e8dfd0",          // warm border
        "border-strong": "#cbb89c",
        text: "#1f1410",            // warm near-black
        "text-muted": "#6b5d50",
        "text-faint": "#a0917e",

        // Primary — gold
        brand: "#f59e0b",           // amber-500
        "brand-dark": "#d97706",    // amber-600
        "brand-darker": "#b45309",  // amber-700
        "brand-light": "#fef3c7",   // amber-100

        // Secondary — burgundy
        burgundy: "#8b1e3f",
        "burgundy-dark": "#6b1530",
        "burgundy-light": "#fce4ec",

        // Status
        success: "#15803d",          // green-700 (deeper for warm palette)
        "success-light": "#dcfce7",
        warning: "#d97706",
        "warning-light": "#fef3c7",
        danger: "#b91c1c",
        "danger-light": "#fee2e2",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(31, 20, 16, 0.04), 0 1px 3px 0 rgba(31, 20, 16, 0.06)",
        card: "0 4px 6px -1px rgba(31, 20, 16, 0.06), 0 2px 4px -2px rgba(31, 20, 16, 0.04)",
        gold: "0 8px 20px -4px rgba(245, 158, 11, 0.3)",
        burgundy: "0 8px 20px -4px rgba(139, 30, 63, 0.3)",
      },
      keyframes: {
        slideIn: {
          "0%": { opacity: 0, transform: "translateX(20px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
      },
      animation: {
        slideIn: "slideIn 0.5s ease-out",
      },
    },
  },
  plugins: [],
};