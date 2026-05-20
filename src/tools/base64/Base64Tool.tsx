import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToast } from '../../components/Toast'

export function Base64Tool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [error, setError] = useState('')
  const { toast } = useToast()

  function handleConvert() {
    setError('')
    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(input))))
      } else {
        setOutput(decodeURIComponent(escape(atob(input.trim()))))
      }
    } catch (e: any) {
      setError(mode === 'decode' ? '无效的 Base64 字符串' : '编码失败: ' + e.message)
      setOutput('')
    }
  }

  function handleSwap() {
    setMode(mode === 'encode' ? 'decode' : 'encode')
    setInput(output)
    setOutput('')
    setError('')
  }

  function handleCopy() {
    if (!output) return
    navigator.clipboard.writeText(output)
    toast('已复制到剪贴板')
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    if (mode === 'encode') {
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1] || ''
        setOutput(base64)
        setInput(`[文件] ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
        toast('文件已编码为 Base64')
      }
      reader.readAsDataURL(file)
    } else {
      reader.onload = () => {
        setInput(reader.result as string)
      }
      reader.readAsText(file)
    }
  }

  return (
    <ToolLayout
      title="Base64 编解码"
      description="文本与文件的 Base64 编码/解码转换"
    >
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMode('encode'); setError('') }}
            className={`px-4 py-2 border-2 font-medium text-sm transition-all ${
              mode === 'encode'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
            style={{ borderRadius: '2px' }}
          >
            编码 (Encode)
          </button>
          <button
            onClick={() => { setMode('decode'); setError('') }}
            className={`px-4 py-2 border-2 font-medium text-sm transition-all ${
              mode === 'decode'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
            style={{ borderRadius: '2px' }}
          >
            解码 (Decode)
          </button>
          <button
            onClick={handleSwap}
            className="ml-auto px-3 py-2 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 transition-all"
            style={{ borderRadius: '2px' }}
            title="交换输入输出"
          >
            ⇅ 交换
          </button>
        </div>

        {/* Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {mode === 'encode' ? '原文' : 'Base64 字符串'}
            </label>
            <label className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
              上传文件
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === 'encode' ? '输入要编码的文本...' : '输入 Base64 字符串...'}
            className="w-full h-32 p-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-sm resize-y focus:border-blue-500 focus:outline-none"
            style={{ borderRadius: '2px' }}
          />
        </div>

        {/* Convert button */}
        <button
          onClick={handleConvert}
          className="w-full py-3 border-2 border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          style={{ borderRadius: '2px' }}
        >
          {mode === 'encode' ? '编码 →' : '← 解码'}
        </button>

        {/* Error */}
        {error && (
          <div className="p-3 border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm" style={{ borderRadius: '2px' }}>
            {error}
          </div>
        )}

        {/* Output */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {mode === 'encode' ? 'Base64 结果' : '解码结果'}
            </label>
            {output && (
              <button
                onClick={handleCopy}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                复制
              </button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="结果将显示在这里..."
            className="w-full h-32 p-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-sm resize-y"
            style={{ borderRadius: '2px' }}
          />
          {output && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {output.length} 字符
            </p>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
