export type ChangelogEntry = {
  date: string
  title: string
  notes?: string[]
}

export function Changelog({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-wide text-gray-900">更新日志</h2>
      <ol className="mt-6 space-y-6">
        {entries.map((e, index) => (
          <li 
            key={`${e.date}-${e.title}`} 
            className="relative pl-6 group"
          >
            {/* 左侧彩色装饰线 */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `linear-gradient(180deg, ${['#ff6b6b', '#f7d794', '#1dd1a1', '#54a0ff', '#5f27cd'][index % 5]}, ${['#f7d794', '#1dd1a1', '#54a0ff', '#5f27cd', '#ff6b6b'][index % 5]})`,
                borderRadius: '2px'
              }}
            />
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1" style={{ borderRadius: '2px' }}>
                  {e.date}
                </span>
                <span className="text-xs text-gray-400">📅</span>
              </div>
              
              <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {e.title}
              </div>
              
              {e.notes && e.notes.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {e.notes.map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                      <span className="text-blue-500 mt-1.5 text-xs">•</span>
                      <span className="leading-relaxed">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}