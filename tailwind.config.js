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
        primary: {
          light: '#0ea5e9', // sky-500
          DEFAULT: '#0284c7', // sky-600
          dark: '#0369a1' // sky-700
        },
        secondary: {
          light: '#14b8a6', // teal-500
          DEFAULT: '#0d9488', // teal-600
          dark: '#0f766e' // teal-700
        },
        accent: '#ec4899', // pink-500
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
      }
    },
  },
  plugins: [],
}