export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b-2 border-gray-200 backdrop-blur-sm">
      {/* 顶部彩色动态线条 */}
      <div 
        className="absolute top-0 left-0 right-0 h-0.5 opacity-80 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
          backgroundSize: '300% 100%',
          animation: 'gradient-flow 12s linear infinite'
        }}
      />
      
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
        {/* Logo */}
        <a 
          href="#" 
          className="flex items-center gap-3 font-bold text-xl tracking-wider text-gray-900 hover:text-blue-600 transition-colors group"
        >
          <div className="text-2xl group-hover:scale-110 transition-transform duration-300">⚙️</div>
          <span>Mecha Tools</span>
        </a>
        
        {/* 导航菜单 */}
        <nav className="ml-auto flex items-center gap-1">
          {[
            { href: '#', icon: '🏠', label: '首页', isActive: true },
            { href: '#calendar', icon: '🗓️', label: '日历' },
            { href: '#changelog', icon: '📝', label: '更新日志' },
            { href: '#about', icon: 'ℹ️', label: '关于' }
          ].map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              className={`relative inline-flex items-center gap-2 px-4 py-2 border-2 font-medium transition-all duration-200 hover:scale-105 hover:border-gray-400 group ${
                item.isActive 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
              style={{ borderRadius: '2px' }}
            >
              {/* 左侧彩色装饰线 */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-0.5 opacity-70"
                style={{
                  background: `linear-gradient(180deg, ${['#ff6b6b', '#f7d794', '#1dd1a1', '#54a0ff'][index % 4]}, ${['#f7d794', '#1dd1a1', '#54a0ff', '#5f27cd'][index % 4]})`,
                  backgroundSize: '100% 200%',
                  animation: 'gradient-flow-vertical 10s linear infinite'
                }}
              />
              
              <span className="text-base group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </span>
              <span className="hidden sm:block">{item.label}</span>
              
              {/* hover时的右侧箭头 */}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm">
                →
              </span>
            </a>
          ))}
        </nav>
      </div>
      
      {/* 内联CSS动画 */}
      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes gradient-flow-vertical {
          0% { background-position: 50% 0%; }
          100% { background-position: 50% 100%; }
        }
      `}</style>
    </header>
  )
}