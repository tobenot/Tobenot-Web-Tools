export type ChangelogEntry = {
  date: string
  title: string
  notes?: string[]
}

const ACCENTS = ['#ff6b6b', '#f7d794', '#1dd1a1', '#54a0ff', '#5f27cd']

export function Changelog({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-wide text-gray-900 dark:text-gray-100">更新日志</h2>
      <ol className="mt-6 space-y-6">
        {entries.map((e, index) => (
          <li
            key={`${e.date}-${e.title}`}
            className="relative pl-6 group"
          >
            {/* 左侧彩色装饰线 */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 opacity-70 group-hover:opacity-100 transition-opacity duration-300 rounded-mech"
              style={{
                background: `linear-gradient(180deg, ${ACCENTS[index % 5]}, ${ACCENTS[(index + 1) % 5]})`
              }}
            />

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-mech">
                  {e.date}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">📅</span>
              </div>

              <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {e.title}
              </div>

              {e.notes && e.notes.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {e.notes.map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-400 text-sm">
                      <span className="text-blue-500 dark:text-blue-400 mt-1.5 text-xs">•</span>
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
