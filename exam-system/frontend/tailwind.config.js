/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f121b',
        panel: '#151b2b',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#3b82f6',
        success: '#10b981',
        danger: '#fb7185',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
