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
    <div className="space-y-6">
      <div className="bg-mech-panel border border-mech-edge rounded-xl shadow-subtle p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-wide">{title}</h2>
          <ShareButton />
        </div>
        {description && <p className="text-mech-muted">{description}</p>}
      </div>

      <div className="bg-mech-panel border border-mech-edge rounded-xl shadow-subtle p-6">{children}</div>

      {designNotes && designNotes.length > 0 && (
        <div className="bg-mech-panel border border-mech-edge rounded-xl shadow-subtle p-6">
          <h3 className="font-medium">设计思路与目的</h3>
          <ul className="list-disc pl-6 mt-2 text-mech-muted">
            {designNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {changelog && changelog.length > 0 && (
        <div className="bg-mech-panel border border-mech-edge rounded-xl shadow-subtle p-6">
          <Changelog entries={changelog} />
        </div>
      )}
    </div>
  )
}