
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
        sans: ["Inter", "Noto Sans Ethiopic", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
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
      popIn: {
        '0%':   { opacity: '0', transform: 'scale(0.85) translateY(20px)' },
        '60%':  { opacity: '1', transform: 'scale(1.04) translateY(0)' },
        '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
      },
      fadeIn: {
        '0%':   { opacity: '0' },
        '100%': { opacity: '1' },
      },
      slideIn: {
        '0%':   { opacity: '0', transform: 'translateY(10px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' },
      },

        },
      bounceIn: {
        '0%':   { opacity: '0', transform: 'scale(0.3) translateY(40px)' },
        '50%':  { opacity: '1', transform: 'scale(1.05) translateY(-4px)' },
        '70%':  { transform: 'scale(0.95) translateY(2px)' },
        '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
      },
      },
      animation: {
        popIn: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        fadeIn: 'fadeIn 0.2s ease-out',
        slideIn: "slideIn 0.5s ease-out",
        bounceIn: 'bounceIn 0.6s ease-out',
      },
    },
  },

  plugins: [],
};
