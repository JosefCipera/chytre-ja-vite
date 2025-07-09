/** @type {import('tailwindcss').Config} */
export default { // Použijte export default pro Vite (ES Modules)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Zahrnuje všechny relevantní soubory ve složce src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}