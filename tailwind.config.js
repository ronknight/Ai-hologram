/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#0A0F1A',
        'secondary': '#10182C',
        'accent': '#00BFFF', // Deep Sky Blue
        'light-accent': '#87CEFA', // Light Sky Blue
        'cyan': '#00FFFF',
        'glow': 'rgba(0, 191, 255, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 30s linear infinite',
        'spin-medium': 'spin 15s linear infinite',
        'spin-fast': 'spin 5s linear infinite',
        'breathing': 'breathing 5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'scan-across': 'scan-across 1.5s ease-in-out infinite',
      },
      keyframes: {
        breathing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px theme(colors.glow)' },
          '50%': { boxShadow: '0 0 35px theme(colors.glow)' },
        },
        'scan-across': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    }
  },
  plugins: [],
}