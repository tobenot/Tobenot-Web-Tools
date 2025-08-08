/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}', './apps/**/*.html', './apps/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        mech: {
          bg: '#f7f7f8',
          panel: '#ffffff',
          edge: '#e5e7eb',
          accent: '#3b82f6',
          text: '#0f172a',
          muted: '#64748b'
        }
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.06)'
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)'
      },
      backgroundSize: {
        grid: '24px 24px'
      }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
}