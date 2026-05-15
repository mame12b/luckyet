/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        surface: "#f8fafc",
        "surface-2": "#f1f5f9",
        border: "#e2e8f0",
        "border-strong": "#cbd5e1",
        text: "#0f172a",
        "text-muted": "#475569",
        "text-faint": "#94a3b8",
        brand: "#4f46e5",
        "brand-dark": "#4338ca",
        "brand-light": "#eef2ff",
        success: "#059669",
        "success-light": "#d1fae5",
        warning: "#d97706",
        "warning-light": "#fef3c7",
        danger: "#dc2626",
        "danger-light": "#fee2e2",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
        card: "0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 2px 4px -2px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};