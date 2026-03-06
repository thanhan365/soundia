/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#170f23',
        'dark-light': '#1e1632',
        'dark-card': '#1a1230',
        neon: '#1db990',
        'neon-dim': '#17966f',
        'gray-dark': '#2a2a3e',
        'gray-mid': '#3a3a50',
      },
      boxShadow: {
        neon: '0 0 15px rgba(29, 185, 144, 0.4), 0 0 30px rgba(29, 185, 144, 0.1)',
        'neon-lg': '0 0 25px rgba(29, 185, 144, 0.5), 0 0 50px rgba(29, 185, 144, 0.2)',
        'neon-sm': '0 0 8px rgba(29, 185, 144, 0.3)',
      },
      animation: {
        'gradient-bg': 'gradientShift 15s ease infinite',
        shimmer: 'shimmer 2s infinite linear',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0, 0, 0.2, 1)',
        'spin-slow': 'spin 8s linear infinite',
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
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}