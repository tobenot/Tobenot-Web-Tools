import { Changelog } from '../components/Changelog'
import { globalChangelog } from '../data/routes'

export function ChangelogPage() {
  return (
    <div className="relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-6">
      <div
        className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
          backgroundSize: '300% 100%',
          animation: 'gradient-flow 16s linear infinite'
        }}
      />
      <Changelog entries={globalChangelog} />
    </div>
  )
}
