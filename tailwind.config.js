/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}', './apps/**/*.html', './apps/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        mech: {
          bg: '#ffffff',
          panel: '#ffffff',
          edge: '#e5e7eb',
          accent: '#3b82f6',
          text: '#0f172a',
          muted: '#64748b'
        }
      },
      /*
       * 机械风的标志性直角圆角。
       * 此前站内到处内联 style={{ borderRadius: '2px' }}，
       * 既绕过了设计系统，也无法统一调整——收进这里，统一用 rounded-mech。
       */
      borderRadius: {
        mech: '2px'
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.06)'
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)'
      },
      backgroundSize: {
        grid: '24px 24px'
      },
      /*
       * 站内动画统一在此定义。
       * 此前 gradient-flow 在 App / Home / Header / Layout / ToolLayout 各写一遍
       * 内联 <style> 块，重复且容易漂移。
       */
      keyframes: {
        'gradient-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' }
        },
        'gradient-flow-vertical': {
          '0%': { backgroundPosition: '50% 0%' },
          '100%': { backgroundPosition: '50% 100%' }
        },
        'slide-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'cmd-fade-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(-8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        'toast-slide-in': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        }
      },
      animation: {
        'gradient-flow': 'gradient-flow 12s linear infinite',
        'gradient-flow-slow': 'gradient-flow 20s linear infinite',
        'gradient-flow-vertical': 'gradient-flow-vertical 14s linear infinite',
        'slide-in-up': 'slide-in-up 0.6s ease-out both',
        'cmd-fade-in': 'cmd-fade-in 0.15s ease-out',
        'toast-slide-in': 'toast-slide-in 0.25s ease-out'
      }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
}
