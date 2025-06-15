export default {
  darkMode: 'class', // 👈 enables manual dark mode toggling
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
      soft: '0 2px 8px rgba(0,0,0,0.05)',
    },
    borderColor: {
      light: '#d2eaff',
      dark: '#374151', // Tailwind gray-700

    },
      colors: {
        primary: '#2563eb', // Tailwind blue-600
        secondary: '#64748b', // Tailwind slate-500
        accent: '#facc15', // Tailwind yellow-400
'app-bg': '#d2eaff',
        'card-border': 'rgba(rgb(239, 239, 239), 0.5)',

      },
    },
  },
  plugins: [
    function({ addBase }) {
      addBase({
        'html': { fontSize: '95%' },
        'body': { backgroundColor: '#d2eaff' },
      })
    }
  ],
}
