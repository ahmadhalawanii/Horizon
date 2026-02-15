/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        horizon: {
          bg: "#f8f9fb",
          surface: "#ffffff",
          card: "#ffffff",
          border: "#e2e8f0",
          accent: "#2563eb",
          "accent-dim": "#1d4ed8",
          green: "#16a34a",
          amber: "#d97706",
          red: "#dc2626",
          text: "#1e293b",
          muted: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
