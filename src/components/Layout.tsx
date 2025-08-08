import { PropsWithChildren } from 'react'

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-full bg-white">
      {children}
      <footer className="max-w-6xl mx-auto px-6 pb-12 pt-16">
        <div className="relative bg-white border-2 border-gray-200 p-6">
          {/* 顶部彩色装饰线 */}
          <div 
            className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-60 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
              backgroundSize: '300% 100%',
              animation: 'gradient-flow 20s linear infinite'
            }}
          />
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚙️</span>
              <span className="font-medium">© {new Date().getFullYear()} Mecha Tools</span>
            </div>
            
            <div className="flex items-center gap-4">
              <a 
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors group" 
                href="#about"
              >
                <span>设计说明</span>
                <span className="text-xs group-hover:translate-x-1 transition-transform duration-300">→</span>
              </a>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>⚡</span>
                <span>白净机械风</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* 内联CSS动画 */}
      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}