import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'

interface DiffLine {
  type: 'same' | 'add' | 'remove'
  text: string
  lineA?: number
  lineB?: number
}

function computeDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split('\n')
  const linesB = b.split('\n')
  const n = linesA.length
  const m = linesB.length

  // Simple LCS-based diff
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  const result: DiffLine[] = []
  let i = n, j = m
  const stack: DiffLine[] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      stack.push({ type: 'same', text: linesA[i - 1], lineA: i, lineB: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'add', text: linesB[j - 1], lineB: j })
      j--
    } else {
      stack.push({ type: 'remove', text: linesA[i - 1], lineA: i })
      i--
    }
  }
  stack.reverse()
  return stack
}

export function TextDiffTool() {
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')

  const diff = useMemo(() => {
    if (!textA && !textB) return []
    return computeDiff(textA, textB)
  }, [textA, textB])

  const stats = useMemo(() => {
    let added = 0, removed = 0, same = 0
    for (const d of diff) {
      if (d.type === 'add') added++
      else if (d.type === 'remove') removed++
      else same++
    }
    return { added, removed, same }
  }, [diff])

  return (
    <ToolLayout
      title="文本 Diff 对比"
      description="逐行对比两段文本，高亮差异"
    >
      <div className="space-y-4">
        {/* Input panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">原文 (A)</label>
            <textarea
              value={textA}
              onChange={e => setTextA(e.target.value)}
              placeholder="粘贴原始文本..."
              className="w-full h-40 p-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-sm resize-y focus:border-blue-500 focus:outline-none"
              style={{ borderRadius: '2px' }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">修改后 (B)</label>
            <textarea
              value={textB}
              onChange={e => setTextB(e.target.value)}
              placeholder="粘贴修改后的文本..."
              className="w-full h-40 p-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-sm resize-y focus:border-blue-500 focus:outline-none"
              style={{ borderRadius: '2px' }}
            />
          </div>
        </div>

        {/* Stats */}
        {diff.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{diff.length} 行</span>
            <span className="text-green-600 dark:text-green-400">+{stats.added} 新增</span>
            <span className="text-red-600 dark:text-red-400">-{stats.removed} 删除</span>
            <span className="text-gray-500 dark:text-gray-400">{stats.same} 相同</span>
          </div>
        )}

        {/* Diff output */}
        {diff.length > 0 && (
          <div className="border-2 border-gray-200 dark:border-gray-600 overflow-hidden" style={{ borderRadius: '2px' }}>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <tbody>
                  {diff.map((line, i) => (
                    <tr
                      key={i}
                      className={
                        line.type === 'add' ? 'bg-green-50 dark:bg-green-900/20' :
                        line.type === 'remove' ? 'bg-red-50 dark:bg-red-900/20' :
                        ''
                      }
                    >
                      <td className="w-10 px-2 py-0.5 text-right text-gray-400 dark:text-gray-600 select-none border-r border-gray-200 dark:border-gray-700">
                        {line.lineA || ''}
                      </td>
                      <td className="w-10 px-2 py-0.5 text-right text-gray-400 dark:text-gray-600 select-none border-r border-gray-200 dark:border-gray-700">
                        {line.lineB || ''}
                      </td>
                      <td className="w-6 px-1 py-0.5 text-center select-none font-bold"
                        style={{ color: line.type === 'add' ? '#16a34a' : line.type === 'remove' ? '#dc2626' : '#9ca3af' }}
                      >
                        {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                      </td>
                      <td className={`px-2 py-0.5 whitespace-pre-wrap break-all ${
                        line.type === 'add' ? 'text-green-800 dark:text-green-300' :
                        line.type === 'remove' ? 'text-red-800 dark:text-red-300' :
                        'text-gray-700 dark:text-gray-300'
                      }`}>
                        {line.text || ' '}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!textA && !textB && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
            在左右两栏输入文本，自动显示差异对比
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
