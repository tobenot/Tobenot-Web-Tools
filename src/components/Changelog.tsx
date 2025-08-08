export type ChangelogEntry = {
  date: string
  title: string
  notes?: string[]
}

export function Changelog({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-wide">更新日志</h2>
      <ol className="mt-4 space-y-4">
        {entries.map((e) => (
          <li key={`${e.date}-${e.title}`} className="border-l-2 border-mech-edge pl-4">
            <div className="text-sm text-mech-muted">{e.date}</div>
            <div className="font-medium mt-1">{e.title}</div>
            {e.notes && e.notes.length > 0 && (
              <ul className="list-disc pl-5 mt-2 text-mech-muted">
                {e.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}