/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2e7d32', // Verde elegante del sistema
          light: '#43a047',
          dark: '#1b5e20',
        },
        secondary: {
          DEFAULT: '#f1f8f1',
          foreground: '#2e7d32',
        }
      },
    },
  },
  plugins: [],
}
