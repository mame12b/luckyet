/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        "bg-card": "#0f0f0f",
        "bg-elevated": "#141414",
        border: "#1f1f1f",
        "border-bright": "#2a2a2a",
        text: "#e8e8e8",
        "text-dim": "#888888",
        "text-faint": "#555555",
        accent: "#00ff9d",
        gold: "#f4c430",
        danger: "#ff4d4d",
        warning: "#ffb800",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};