import { PropsWithChildren } from 'react'

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-full">
      {children}
      <footer className="max-w-5xl mx-auto px-4 pb-12 pt-8 text-sm text-mech-muted">
        <div className="mecha-panel p-4 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Mecha Tools</span>
          <a className="underline hover:text-black" href="#about">设计说明</a>
        </div>
      </footer>
    </div>
  )
}