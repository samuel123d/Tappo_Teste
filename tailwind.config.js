/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tappo: {
          lime: '#a3e635',
          dark: '#0a0b0e',
          card: '#14151a',
          red: '#e11d48',
        }
      }
    },
  },
  plugins: [],
}
