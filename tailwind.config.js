/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        f1: {
          red: '#E10600',
          background: '#15151E',
          panel: '#1E1E2E',
          text: '#FFFFFF',
          accent: '#00D9FF',
        }
      }
    }
  },
  plugins: []
}
