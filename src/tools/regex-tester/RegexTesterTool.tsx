import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToast } from '../../components/Toast'

interface MatchResult {
  full: string
  index: number
  groups: string[]
}

/*
 * 病态正则（如 /(a+)+$/ 配长文本）会指数级回溯，正则测试器的用户
 * 恰恰最容易写出这类表达式。JS 的 RegExp 无法中断，只能靠
 * 限制匹配轮数与检查累计耗时来避免整个标签页冻死。
 */
const MAX_MATCHES = 10_000
const TIME_BUDGET_MS = 50

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
}

interface RegexRunResult {
  matches: MatchResult[]
  highlighted: string
  error: string
  truncated: boolean
}

function runRegex(pattern: string, flags: string, testText: string): RegexRunResult {
  const empty: RegexRunResult = { matches: [], highlighted: '', error: '', truncated: false }
  if (!pattern || !testText) return empty

  let regex: RegExp
  try {
    regex = new RegExp(pattern, flags)
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : String(e) }
  }

  const results: MatchResult[] = []
  let truncated = false

  try {
    if (flags.includes('g')) {
      const startedAt = Date.now()
      let m: RegExpExecArray | null
      while ((m = regex.exec(testText)) !== null) {
        results.push({ full: m[0], index: m.index, groups: m.slice(1) })
        if (!m[0]) regex.lastIndex++

        if (results.length >= MAX_MATCHES || Date.now() - startedAt > TIME_BUDGET_MS) {
          truncated = true
          break
        }
      }
    } else {
      const m = regex.exec(testText)
      if (m) results.push({ full: m[0], index: m.index, groups: m.slice(1) })
    }
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : String(e) }
  }

  let html = ''
  let lastIdx = 0
  for (const r of results) {
    html += escapeHtml(testText.slice(lastIdx, r.index))
    html += `<mark class="bg-yellow-200 dark:bg-yellow-700/60 text-gray-900 dark:text-yellow-100 px-0.5 rounded-sm">${escapeHtml(r.full)}</mark>`
    lastIdx = r.index + r.full.length
  }
  html += escapeHtml(testText.slice(lastIdx))

  return { matches: results, highlighted: html, error: '', truncated }
}

export function RegexTesterTool() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [testText, setTestText] = useState('')
  const { toast } = useToast()

  /*
   * error / truncated 作为派生结果返回，而非在 useMemo 里 setState。
   * 渲染期间更新 state 会触发 React 警告，StrictMode 下行为更难预期。
   */
  const { matches, highlighted, error, truncated } = useMemo(
    () => runRegex(pattern, flags, testText),
    [pattern, flags, testText],
  )

  function handleCopyRegex() {
    navigator.clipboard.writeText(`/${pattern}/${flags}`)
    toast('正则已复制')
  }

  const flagOptions = [
    { flag: 'g', label: 'global' },
    { flag: 'i', label: 'ignoreCase' },
    { flag: 'm', label: 'multiline' },
    { flag: 's', label: 'dotAll' },
  ]

  return (
    <ToolLayout
      title="正则测试器"
      description="实时测试正则表达式，高亮匹配结果，显示捕获分组"
    >
      <div className="space-y-4">
        {/* Pattern input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">正则表达式</label>
            {pattern && (
              <button onClick={handleCopyRegex} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                复制
              </button>
            )}
          </div>
          <div className="flex items-stretch border-2 border-gray-200 dark:border-gray-600 focus-within:border-blue-500 rounded-mech">
            <span className="flex items-center px-3 text-gray-400 dark:text-gray-500 font-mono text-lg border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">/</span>
            <input
              type="text"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="输入正则..."
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm outline-none placeholder-gray-400 dark:placeholder-gray-500"
            />
            <span className="flex items-center px-2 text-gray-400 dark:text-gray-500 font-mono text-lg border-l border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">/</span>
            <input
              type="text"
              value={flags}
              onChange={e => setFlags(e.target.value)}
              className="w-14 px-2 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-sm outline-none"
              placeholder="flags"
            />
          </div>
        </div>

        {/* Flags shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          {flagOptions.map(({ flag, label }) => (
            <button
              key={flag}
              onClick={() => setFlags(f => f.includes(flag) ? f.replace(flag, '') : f + flag)}
              className={`px-2 py-1 text-xs font-mono border transition-all ${
                flags.includes(flag)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
              } rounded-mech`}
            >
              {flag} <span className="text-[10px] opacity-60">{label}</span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-mono rounded-mech">
            {error}
          </div>
        )}

        {/* Test text */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">测试文本</label>
          <textarea
            value={testText}
            onChange={e => setTestText(e.target.value)}
            placeholder="输入要测试的文本..."
            className="w-full h-28 p-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-sm resize-y focus:border-blue-500 focus:outline-none rounded-mech"
          />
        </div>

        {/* Highlighted result */}
        {highlighted && (
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              匹配结果 ({matches.length} 个匹配{truncated ? '，已截断' : ''})
            </label>
            {truncated && (
              <div className="mb-2 p-2 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs rounded-mech">
                该正则匹配过多或回溯耗时过长，已提前停止以避免页面卡死。请检查是否存在嵌套量词（如 <code className="font-mono">(a+)+</code>）。
              </div>
            )}
            <div
              className="p-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all rounded-mech"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </div>
        )}

        {/* Match details */}
        {matches.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">匹配详情</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {matches.map((m, i) => (
                <div key={i} className="flex items-start gap-3 text-xs font-mono p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-mech">
                  <span className="text-gray-400 dark:text-gray-500 w-6 flex-shrink-0">#{i}</span>
                  <span className="text-green-700 dark:text-green-400 flex-shrink-0">@{m.index}</span>
                  <span className="text-gray-900 dark:text-gray-100 break-all">"{m.full}"</span>
                  {m.groups.length > 0 && (
                    <span className="text-blue-600 dark:text-blue-400 break-all">
                      组: [{m.groups.map(g => `"${g}"`).join(', ')}]
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
