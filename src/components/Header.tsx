export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-mech-edge/70 mecha-header">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
        <a href="#" className="font-semibold tracking-wider hover:text-black">Mecha Tools</a>
        <nav className="ml-auto flex items-center gap-2">
          <a className="inline-flex items-center gap-2 px-3 py-2 rounded-[3px] border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" href="#"><span>🏠</span><span>首页</span></a>
          <a className="inline-flex items-center gap-2 px-3 py-2 rounded-[3px] border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" href="#calendar"><span>🗓️</span><span>日历</span></a>
          <a className="inline-flex items-center gap-2 px-3 py-2 rounded-[3px] border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" href="#changelog"><span>📝</span><span>更新日志</span></a>
          <a className="inline-flex items-center gap-2 px-3 py-2 rounded-[3px] border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" href="#about"><span>ℹ️</span><span>关于</span></a>
        </nav>
      </div>
    </header>
  )
}