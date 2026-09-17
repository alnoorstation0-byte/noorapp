/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        titanium: {
          950: '#0B0D11',
          900: '#0F1218',
          850: '#141820',
          800: '#1A1E28',
          700: '#252B38',
          600: '#333B4C',
        },
        neon: {
          cyan: '#00E5FF',
          'cyan-dark': '#00B4D8',
          orange: '#E06D44',
          'orange-glow': '#FF7A45',
          gold: '#C29B62',
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 229, 255, 0.4)',
        'neon-cyan-lg': '0 0 30px rgba(0, 229, 255, 0.6)',
        'neon-orange': '0 0 15px rgba(224, 109, 68, 0.45)',
        'neon-orange-lg': '0 0 30px rgba(224, 109, 68, 0.65)',
        'command-card': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      fontFamily: {
        cairo: ['var(--font-cairo)', 'Cairo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}