/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mech: {
          bg: '#0e0f11',
          panel: '#15171b',
          edge: '#2a2e36',
          accent: '#d4af37',
          text: '#e5e7eb',
          muted: '#9aa0a6'
        }
      },
      boxShadow: {
        insetGlow: 'inset 0 0 40px rgba(212,175,55,0.07)'
      },
      backgroundImage: {
        mesh: 'radial-gradient(ellipse at top, rgba(212,175,55,0.045), transparent 60%), radial-gradient(ellipse at bottom, rgba(88,101,242,0.04), transparent 60%)',
        grid: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)'
      },
      backgroundSize: {
        grid: '24px 24px'
      }
    }
  },
  plugins: []
}