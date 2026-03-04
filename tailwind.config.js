/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0f0f0f',
        'dark-light': '#1a1a2e',
        'dark-card': '#16162a',
        neon: '#00ffcc',
        'neon-dim': '#00cc99',
        'gray-dark': '#2a2a3e',
        'gray-mid': '#3a3a50',
      },
      boxShadow: {
        neon: '0 0 15px rgba(0, 255, 204, 0.4), 0 0 30px rgba(0, 255, 204, 0.1)',
        'neon-lg': '0 0 25px rgba(0, 255, 204, 0.5), 0 0 50px rgba(0, 255, 204, 0.2)',
        'neon-sm': '0 0 8px rgba(0, 255, 204, 0.3)',
      },
      animation: {
        'gradient-bg': 'gradientShift 15s ease infinite',
        shimmer: 'shimmer 2s infinite linear',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0, 255, 204, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 255, 204, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}