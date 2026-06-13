/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sleek corporate custom dark-palette colors
        slate: {
          950: '#0b0f19',
        }
      }
    },
  },
  plugins: [],
}
