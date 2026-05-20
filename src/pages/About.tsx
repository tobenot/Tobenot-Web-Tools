export function About() {
  return (
    <div className="relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <div
        className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
          backgroundSize: '300% 100%',
          animation: 'gradient-flow 16s linear infinite'
        }}
      />
      <h2 className="text-xl font-bold tracking-wide text-gray-900 dark:text-gray-100">关于与设计</h2>
      <p className="text-gray-600 dark:text-gray-400">
        本站聚焦简洁实用的现代 Web 工具，采用机械风 UI 与统一模板，支持哈希直达链接，方便分享传播。
      </p>
      <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-1">
        <li>技术栈：React + Tailwind + Vite</li>
        <li>导航：`#` 路由，单页应用</li>
        <li>部署：GitHub Pages 自动化</li>
      </ul>
    </div>
  )
}
