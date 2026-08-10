import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToast } from '../../components/Toast'
import { batSections, buildBat, type ArchiveLevel } from './batBuilder'

const labelCls = 'text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block'

export function SecureArchiveTool() {
  const [level, setLevel] = useState<ArchiveLevel>('max')
  const [encryptNames, setEncryptNames] = useState(true)
  const { toast } = useToast()

  const opts = useMemo(() => ({ src: '', out: '', level, encryptNames }), [level, encryptNames])
  const bat = useMemo(() => buildBat(opts), [opts])
  const sections = useMemo(() => batSections(opts), [opts])

  function handleDownload() {
    const blob = new Blob([bat], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '安全压缩加密.bat'
    a.click()
    URL.revokeObjectURL(url)
    toast('已下载脚本')
  }

  function handleCopy() {
    navigator.clipboard.writeText(bat)
    toast('已复制')
  }

  return (
    <ToolLayout
      title="安全压缩脚本"
      description="为 Windows + 7-Zip 生成加密压缩脚本（.bat）：AES-256 加密文件与文件名，密码交互式输入，拖拽即用，全程不碰网络。"
      designNotes={[
        '为什么是「脚本生成器」而不是「网页里直接压缩」：浏览器拿不到本机文件路径，也调不动本机 7-Zip；真要让网页收文件再压缩，文件就得先上传过一遍网络——那才是把数据交给别人。脚本在本机运行，数据不出机器。',
        '密码为什么留在脚本外：如果网页生成密码、或把密码写进脚本，密码就落在脚本/URL/命令行历史里，等于没加密。7-Zip 的交互式输入不回显，密码只存在于你自己（或你自己的密码管理器）里——这正是「从外部拿密码」的正确含义。',
        '-mhe=on 加密文件头：连压缩包里的文件名都看不见。ZIP 的 AES 也做不到这一点，这是 7z 才有的能力。',
        '忘记密码 = 数据永久丢失：7-Zip 没有后门，没有客服能帮你找回。请把密码放进你自己的密码管理器。',
      ]}
    >
      <div className="space-y-6">
        {/* 用法 */}
        <div className="p-4 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-mech space-y-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100">怎么用：</p>
          <p>① 下载脚本 → ② 把文件/文件夹直接拖到脚本图标上（或双击后输入路径）→ ③ 交互式输入两次密码 → ④ 在源旁边生成「源名_时间戳.7z」。</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">密码只在你本机输入，不会经过这个网页，也不会写进脚本或命令行历史。</p>
        </div>

        {/* 选项 */}
        <div className="flex flex-wrap gap-5 items-end">
          <div>
            <label className={labelCls}>压缩级别</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as ArchiveLevel)}
              className="p-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm rounded-mech focus:border-blue-500 focus:outline-none"
            >
              <option value="max">最高（mx=9，慢）</option>
              <option value="normal">标准（mx=5）</option>
              <option value="fast">快速（mx=1）</option>
            </select>
          </div>
          <label className="flex items-center gap-2 pb-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={encryptNames}
              onChange={(e) => setEncryptNames(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            加密文件名（-mhe=on，推荐）
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownload}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-mech transition-colors"
          >
            下载 .bat 脚本
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-mech transition-colors"
          >
            复制脚本
          </button>
        </div>

        {/* 逐行解析 */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">脚本逐行解析</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              下面的代码就是下载脚本的实际内容，每一段都解释它在做什么、为什么这样写是对的——想复核的话先看清楚再跑。
            </p>
          </div>
          {sections.map((s, i) => (
            <div key={i} className="border-2 border-gray-200 dark:border-gray-700 rounded-mech overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {i + 1}. {s.title}
                </span>
              </div>
              <div className="px-3 py-2 bg-white dark:bg-gray-900">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{s.note}</p>
                <pre className="mt-2 overflow-auto p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-200 rounded select-all">
                  {s.code.join('\n')}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}
