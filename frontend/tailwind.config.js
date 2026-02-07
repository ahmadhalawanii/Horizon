/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        horizon: {
          bg: "#0a0e17",
          surface: "#111827",
          card: "#1a2332",
          border: "#1e293b",
          accent: "#06b6d4",
          "accent-dim": "#0891b2",
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          text: "#e2e8f0",
          muted: "#94a3b8",
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
