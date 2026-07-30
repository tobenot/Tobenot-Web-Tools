import { tools } from '../data/routes'

/**
 * 未知路由兜底页。
 *
 * 站点刚经历域名迁移（tobenot.top/Tobenot-Web-Tools/ → tools.tobenot.top），
 * 外部旧链接与书签失效概率不低；此前这类路径会渲染成纯空白，
 * 用户无法判断是加载失败还是链接失效。
 */
export function NotFound({ path }: { path: string }) {
  const suggestions = tools.filter((t) => t.category === 'utility').slice(0, 6)

  return (
    <div className="max-w-2xl mx-auto text-center py-16 space-y-8">
      <div>
        <div className="text-6xl mb-4">🧭</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">找不到这个页面</h2>
        <p className="text-gray-600 dark:text-gray-400">
          没有找到路径
          <code className="mx-1.5 px-2 py-0.5 font-mono text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-mech break-all">
            #{path}
          </code>
          对应的工具。
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          链接可能已失效，或来自旧域名下的书签。
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <a
          href="#"
          className="px-6 py-3 border-2 border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors rounded-mech"
        >
          返回首页
        </a>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="px-6 py-3 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:border-blue-400 dark:hover:border-blue-500 transition-colors rounded-mech"
        >
          搜索工具 (Ctrl+K)
        </button>
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          常用工具
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {suggestions.map((t) => (
            <a
              key={t.id}
              href={t.href}
              className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-all rounded-mech"
            >
              <span>{t.emoji}</span>
              <span>{t.title}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
