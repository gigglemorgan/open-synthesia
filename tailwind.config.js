/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        piano: {
          dark: '#0f1117',
          surface: '#181b24',
          card: '#1e2230',
          border: '#2a3044',
          accent: '#6366f1',
          leftHand: '#3b82f6', // Sol el mavi
          rightHand: '#10b981', // Sağ el yeşil
          pedal: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
