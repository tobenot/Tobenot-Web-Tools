import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToast } from '../../components/Toast'

type CodecMode = 'encodeURI' | 'decodeURI' | 'encodeComp' | 'decodeComp'

const modeLabels: Record<CodecMode, string> = {
  encodeURI: 'encodeURI',
  decodeURI: 'decodeURI',
  encodeComp: 'encodeURIComponent',
  decodeComp: 'decodeURIComponent',
}

export function UrlCodecTool() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<Record<CodecMode, string>>({
    encodeURI: '', decodeURI: '', encodeComp: '', decodeComp: ''
  })
  const [error, setError] = useState('')
  const { toast } = useToast()

  function handleConvert(text: string) {
    setInput(text)
    setError('')
    if (!text) {
      setResults({ encodeURI: '', decodeURI: '', encodeComp: '', decodeComp: '' })
      return
    }
    try {
      setResults({
        encodeURI: encodeURI(text),
        decodeURI: safeDecodeURI(text),
        encodeComp: encodeURIComponent(text),
        decodeComp: safeDecodeURIComponent(text),
      })
    } catch (e: any) {
      setError(e.message)
    }
  }

  function safeDecodeURI(s: string): string {
    try { return decodeURI(s) } catch { return '(无法解码)' }
  }
  function safeDecodeURIComponent(s: string): string {
    try { return decodeURIComponent(s) } catch { return '(无法解码)' }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    toast('已复制')
  }

  return (
    <ToolLayout
      title="URL 编解码"
      description="encodeURI / decodeURI / encodeURIComponent / decodeURIComponent 实时转换"
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">输入文本或 URL</label>
          <textarea
            value={input}
            onChange={e => handleConvert(e.target.value)}
            placeholder="输入要编解码的内容... 例如: https://example.com/路径?q=你好"
            className="w-full h-24 p-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-sm resize-y focus:border-blue-500 focus:outline-none"
            style={{ borderRadius: '2px' }}
          />
        </div>

        {error && (
          <div className="p-3 border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm" style={{ borderRadius: '2px' }}>
            {error}
          </div>
        )}

        {input && (
          <div className="space-y-3">
            {(Object.keys(modeLabels) as CodecMode[]).map(mode => (
              <div key={mode} className="border-2 border-gray-200 dark:border-gray-700 p-3" style={{ borderRadius: '2px' }}>
                <div className="flex items-center justify-between mb-2">
                  <code className="text-xs font-bold text-blue-600 dark:text-blue-400">{modeLabels[mode]}</code>
                  <button
                    onClick={() => handleCopy(results[mode])}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    复制
                  </button>
                </div>
                <div className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all bg-gray-50 dark:bg-gray-800 p-2 select-all" style={{ borderRadius: '2px' }}>
                  {results[mode] || '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {!input && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            输入内容后自动显示四种编解码结果
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
