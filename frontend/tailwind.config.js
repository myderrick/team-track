// tailwind.config.js (v4-safe, minimal)
export default {
  darkMode: "class",
  theme: {
    extend: {
      boxShadow: {soft: "0 2px 8px rgba(0,0,0,0.05)"},
      borderColor: {light: "#d2eaff", dark: "#374151"},
      colors: {
        primary: "#2563eb",
        secondary: "#64748b",
        accent: "#facc15",
        "app-bg": "#d2eaff",
        "card-border": "rgba(239, 239, 239, 0.5)",
      },
    },
  },
};
