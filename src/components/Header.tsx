export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-mech-edge/70 backdrop-blur bg-mech-bg/70">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
        <a href="#" className="font-semibold tracking-wider hover:text-white">Mecha Tools</a>
        <nav className="ml-auto flex items-center gap-2">
          <a className="btn" href="#">首页</a>
          <a className="btn" href="#calendar">日历</a>
          <a className="btn" href="#changelog">更新日志</a>
          <a className="btn" href="#about">关于</a>
        </nav>
      </div>
    </header>
  )
}