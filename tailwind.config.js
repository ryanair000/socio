/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        'tripadvisor-green': '#34E0A1',
        'tripadvisor-header-bg': '#FFFFFF',
        'tripadvisor-text-dark': '#000A12',
        'tripadvisor-text-gray': '#5C5C5C',
        'tripadvisor-search-bg': '#F2F2F2',
      }
    },
  },
  plugins: [],
}; 