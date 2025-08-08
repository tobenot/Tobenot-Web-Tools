import { PropsWithChildren } from 'react'
import { ShareButton } from './ShareButton'
import { Changelog, ChangelogEntry } from './Changelog'

export function ToolLayout({
  title,
  description,
  designNotes,
  changelog,
  children,
}: PropsWithChildren<{ title: string; description?: string; designNotes?: string[]; changelog?: ChangelogEntry[] }>) {
  return (
    <div className="space-y-8">
      {/* 工具标题区域 */}
      <div className="relative bg-white border-2 border-gray-200 p-6">
        <div 
          className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
            backgroundSize: '300% 100%',
            animation: 'gradient-flow 12s linear infinite'
          }}
        />
        
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-wide text-gray-900">{title}</h2>
            {description && <p className="text-gray-600 leading-relaxed">{description}</p>}
          </div>
          <ShareButton />
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="relative bg-white border-2 border-gray-200 p-6">
        <div 
          className="absolute -top-0.5 -left-0.5 w-1 h-full opacity-80 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, #1dd1a1, #54a0ff)',
            backgroundSize: '100% 300%',
            animation: 'gradient-flow-vertical 14s linear infinite'
          }}
        />
        {children}
      </div>

      {/* 设计思路 */}
      {designNotes && designNotes.length > 0 && (
        <div className="relative bg-white border-2 border-gray-200 p-6">
          <div 
            className="absolute -top-0.5 -left-0.5 w-1 h-full opacity-80 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, #f7d794, #ff6b6b)',
              backgroundSize: '100% 300%',
              animation: 'gradient-flow-vertical 16s linear infinite'
            }}
          />
          <h3 className="font-bold text-lg text-gray-900 mb-4">设计思路与目的</h3>
          <ul className="space-y-2">
            {designNotes.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-600">
                <span className="text-blue-500 mt-1.5 text-xs">•</span>
                <span className="leading-relaxed">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 更新日志 */}
      {changelog && changelog.length > 0 && (
        <div className="relative bg-white border-2 border-gray-200 p-6">
          <div 
            className="absolute -top-0.5 -left-0.5 w-1 h-full opacity-80 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, #5f27cd, #1dd1a1)',
              backgroundSize: '100% 300%',
              animation: 'gradient-flow-vertical 18s linear infinite'
            }}
          />
          <Changelog entries={changelog} />
        </div>
      )}
      
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
    </div>
  )
}