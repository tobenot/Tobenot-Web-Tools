import { useState } from 'react'
import { getTheme, toggleTheme } from '../utils/theme'

export function Header() {
  const [theme, setThemeState] = useState(getTheme())

  function handleToggle() {
    const next = toggleTheme()
    setThemeState(next)
  }

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      {/* 顶部彩色动态线条 */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-80 pointer-events-none animate-gradient-flow"
        style={{
          background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
          backgroundSize: '300% 100%'
        }}
      />

      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-3 font-bold text-xl tracking-wider text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
        >
          <div className="text-2xl group-hover:scale-110 transition-transform duration-300">⚙️</div>
          <span>Mecha Tools</span>
        </a>

        {/* 导航菜单 */}
        <nav className="ml-auto flex items-center gap-1">
          {[
            { href: '/', icon: '🏠', label: '首页' },
            { href: '/calendar', icon: '🗓️', label: '日历' },
            { href: '/changelog', icon: '📝', label: '日志' },
            { href: '/about', icon: 'ℹ️', label: '关于' }
          ].map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              className="relative inline-flex items-center gap-2 px-3 py-2 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-all duration-200 hover:scale-105 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 group rounded-mech"
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 opacity-70 animate-gradient-flow-vertical"
                style={{
                  background: `linear-gradient(180deg, ${['#ff6b6b', '#f7d794', '#1dd1a1', '#54a0ff'][index % 4]}, ${['#f7d794', '#1dd1a1', '#54a0ff', '#5f27cd'][index % 4]})`,
                  backgroundSize: '100% 200%'
                }}
              />
              <span className="text-base group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </span>
              <span className="hidden sm:block text-sm">{item.label}</span>
            </a>
          ))}

          {/* Theme toggle */}
          <button
            onClick={handleToggle}
            className="ml-2 inline-flex items-center justify-center w-9 h-9 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 rounded-mech"
            title={theme === 'dark' ? '切换亮色' : '切换暗色'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>
    </header>
  )
}
