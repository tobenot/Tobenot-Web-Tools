import { useEffect, useRef, useState } from 'react'

const FONT_SIZES = [40, 60, 80, 100, 120, 140, 160, 180, 200, 240, 280, 320] as const
const DEFAULT_FONT_SIZE = 160

interface PhraseCategory {
	id: string
	name: string
	phrases: string[]
}

const STATIC_CATEGORIES: PhraseCategory[] = [
	{
		id: 'common',
		name: '⭐ 常用短语',
		phrases: ['谢谢', '好的', '不', '请等一下', '我需要帮助']
	},
	{
		id: 'communication',
		name: '👋 问候沟通',
		phrases: ['你好', '再见', '没关系', '请进', '请帮我写字', '请稍等，我正在用大字交流']
	},
	{
		id: 'physical',
		name: '🚑 身体与急需',
		phrases: ['疼', '不舒服', '厕所', '水', '冷', '热', '药', '我想躺下', '胸口闷']
	},
	{
		id: 'opinion',
		name: '💡 想法与意见',
		phrases: ['对', '不对', '不知道', '没兴趣', '赞成', '反对', '我觉得可以', '请听我说']
	},
	{
		id: 'tips',
		name: '🗣️ 提示与指示',
		phrases: [
			'请看这里',
			'听不见，请写字',
			'说话请大声一点',
			'手机没电了',
			'能帮我拿一下东西吗？'
		]
	}
]

export function BigTextTool() {
	// 阶段状态: 'edit' | 'display'
	const [stage, setStage] = useState<'edit' | 'display'>('edit')
	const [text, setText] = useState('')
	const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE)
	const [isFullscreen, setIsFullscreen] = useState(false)
	
	// 深色模式：初始化跟随系统/项目，并在初始化后观察
	const [darkMode, setDarkMode] = useState(() => {
		if (typeof document !== 'undefined') {
			return document.documentElement.classList.contains('dark')
		}
		return true
	})

	// 当前激活的分类
	const [activeCategoryId, setActiveCategoryId] = useState('common')

	// 自定义短语列表
	const [customPhrases, setCustomPhrases] = useState<string[]>(() => {
		try {
			const saved = localStorage.getItem('bigtext_custom_phrases')
			return saved ? JSON.parse(saved) : []
		} catch {
			return []
		}
	})

	const [newPhraseInput, setNewPhraseInput] = useState('')
	const [showFloatingControls, setShowFloatingControls] = useState(false)
	const controlsTimeoutRef = useRef<any>(null)

	const inputRef = useRef<HTMLTextAreaElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	// 自动同步 localStorage 中的自定义短语
	useEffect(() => {
		localStorage.setItem('bigtext_custom_phrases', JSON.stringify(customPhrases))
	}, [customPhrases])

	// 监听 documentElement class 变化同步深色模式
	useEffect(() => {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === 'class') {
					const isDark = document.documentElement.classList.contains('dark')
					setDarkMode(isDark)
				}
			})
		})
		observer.observe(document.documentElement, { attributes: true })
		return () => observer.disconnect()
	}, [])

	// 监听全屏
	useEffect(() => {
		const onFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement)
		}
		document.addEventListener('fullscreenchange', onFullscreenChange)
		return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
	}, [])

	// 监听展示模式下的键盘快捷键：Esc 退出，或者输入时快捷交互
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (stage === 'display') {
				if (e.key === 'Escape' || e.key === 'Enter') {
					setStage('edit')
				}
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [stage])

	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			containerRef.current?.requestFullscreen()
		} else {
			document.exitFullscreen()
		}
	}

	function handleClear() {
		setText('')
		inputRef.current?.focus()
	}

	function handlePhraseClick(phrase: string) {
		setText(phrase)
		if (stage === 'edit') {
			inputRef.current?.focus()
		}
	}

	// 自定义短语管理
	function handleAddCustomPhrase() {
		const trimmed = newPhraseInput.trim()
		if (trimmed && !customPhrases.includes(trimmed)) {
			setCustomPhrases(prev => [...prev, trimmed])
			setNewPhraseInput('')
		}
	}

	function handleDeleteCustomPhrase(phraseToDelete: string, e: React.MouseEvent) {
		e.stopPropagation() // 防止点击删除按钮触发了选择短语
		setCustomPhrases(prev => prev.filter(p => p !== phraseToDelete))
	}

	// 在展示模式下，检测鼠标移动来显示悬浮控制栏
	function handleMouseMove() {
		if (stage !== 'display') return
		setShowFloatingControls(true)
		if (controlsTimeoutRef.current) {
			clearTimeout(controlsTimeoutRef.current)
		}
		controlsTimeoutRef.current = setTimeout(() => {
			setShowFloatingControls(false)
		}, 3000)
	}

	useEffect(() => {
		return () => {
			if (controlsTimeoutRef.current) {
				clearTimeout(controlsTimeoutRef.current)
			}
		}
	}, [])

	// 获取当前显示的分类名称与短语列表
	const categories: PhraseCategory[] = [
		...STATIC_CATEGORIES,
		{
			id: 'custom',
			name: '🏷️ 自定义',
			phrases: customPhrases
		}
	]

	const activeCategory = categories.find(c => c.id === activeCategoryId) || categories[0]

	// 样式相关
	const bg = darkMode ? 'bg-gray-950' : 'bg-gray-50'
	const textBaseColor = darkMode ? 'text-gray-100' : 'text-gray-900'
	const borderColor = darkMode ? 'border-gray-800' : 'border-gray-200'
	const subTextColor = darkMode ? 'text-gray-400' : 'text-gray-500'
	const inputBg = darkMode ? 'bg-gray-900 text-white placeholder-gray-600 border-gray-800' : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200'
	const panelBg = darkMode ? 'bg-gray-900/60' : 'bg-white/60'
	
	const btnBase = darkMode
		? 'border border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800'
		: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
		
	const activeBtnBase = darkMode
		? 'border-blue-600 bg-blue-950/40 text-blue-400'
		: 'border-blue-500 bg-blue-50 text-blue-600'

	return (
		<div
			ref={containerRef}
			className={`flex flex-col ${bg} ${isFullscreen ? 'h-screen' : 'min-h-[calc(100vh-120px)]'} transition-colors duration-300`}
			onMouseMove={handleMouseMove}
		>
			{stage === 'edit' ? (
				/* ======================= 编辑/选词阶段 ======================= */
				<div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
					{/* 左半部分/上方：词库分类与短语选择 */}
					<div className="flex-1 flex flex-col min-w-0">
						<div className="flex items-center justify-between mb-4">
							<h2 className={`text-lg font-bold ${textBaseColor}`}>选择快捷短语</h2>
							<span className={`text-xs ${subTextColor}`}>点击直接填入输入框</span>
						</div>

						{/* 分类切换器 */}
						<div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none border-b border-gray-200 dark:border-gray-800">
							{categories.map(cat => (
								<button
									key={cat.id}
									onClick={() => setActiveCategoryId(cat.id)}
									className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all rounded-md border ${
										activeCategoryId === cat.id ? activeBtnBase : btnBase
									}`}
								>
									{cat.name}
								</button>
							))}
						</div>

						{/* 短语卡片网格 */}
						<div className={`flex-1 overflow-y-auto max-h-[320px] lg:max-h-[500px] p-2 rounded-xl border ${borderColor} ${darkMode ? 'bg-gray-900/30' : 'bg-gray-100/30'}`}>
							{activeCategoryId === 'custom' && (
								<div className="flex gap-2 p-2 mb-3 border-b border-gray-200 dark:border-gray-800">
									<input
										type="text"
										value={newPhraseInput}
										onChange={e => setNewPhraseInput(e.target.value)}
										onKeyDown={e => e.key === 'Enter' && handleAddCustomPhrase()}
										placeholder="输入新短语..."
										className={`flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
									/>
									<button
										onClick={handleAddCustomPhrase}
										className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
									>
										添加
									</button>
								</div>
							)}

							{activeCategory.phrases.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<span className="text-3xl mb-2">🏷️</span>
									<p className={`text-sm ${subTextColor}`}>暂无自定义短语</p>
									<p className={`text-xs ${subTextColor} mt-1`}>在上方输入框中添加您专属的常用短语</p>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
									{activeCategory.phrases.map((phrase, idx) => (
										<div
											key={idx}
											onClick={() => handlePhraseClick(phrase)}
											className={`group relative flex items-center justify-between p-3.5 text-sm font-medium text-left cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm rounded-lg border ${
												text === phrase ? activeBtnBase : btnBase
											}`}
										>
											{/* 文本换行自适应，防止长短句溢出 */}
											<span className="break-all pr-4 line-clamp-2 leading-relaxed">{phrase}</span>
											
											{activeCategoryId === 'custom' && (
												<button
													onClick={(e) => handleDeleteCustomPhrase(phrase, e)}
													className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-500 text-gray-400 transition-all shrink-0"
													title="删除"
												>
													<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* 右半部分/下方：实时编辑与预览控制 */}
					<div className="w-full lg:w-[450px] shrink-0 flex flex-col gap-5">
						<div>
							<h2 className={`text-lg font-bold ${textBaseColor} mb-4`}>输入与配置</h2>
							<textarea
								ref={inputRef}
								value={text}
								onChange={e => setText(e.target.value)}
								placeholder="输入您想展示的任何大字文字..."
								rows={3}
								autoFocus
								className={`w-full px-4 py-3 text-lg border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
							/>
						</div>

						{/* 实时预览区 */}
						<div className={`p-5 rounded-xl border ${borderColor} ${darkMode ? 'bg-gray-900/50' : 'bg-gray-100/50'} relative min-h-[120px] flex items-center justify-center overflow-hidden group`}>
							<div className="absolute top-2.5 left-3 text-[10px] font-bold uppercase tracking-wider opacity-40">实时预览效果</div>
							{text ? (
								<p
									className={`${textBaseColor} leading-snug text-center break-all whitespace-pre-wrap max-w-full`}
									style={{ fontSize: `${Math.min(fontSize * 0.35, 42)}px`, fontWeight: 700 }}
								>
									{text}
								</p>
							) : (
								<p className={`${subTextColor} text-sm select-none`}>暂无输入，将在展示模式中大字显示</p>
							)}
						</div>

						{/* 字号微调与设置工具栏 */}
						<div className="space-y-4">
							<div>
								<div className="flex justify-between items-center mb-2">
									<label className={`text-sm font-semibold ${textBaseColor}`}>展示字号 ({fontSize}px)</label>
									<div className="flex gap-1">
										<button
											onClick={() => setFontSize(prev => Math.max(40, prev - 20))}
											className={`px-2.5 py-1 text-xs rounded font-medium ${btnBase}`}
											title="缩小字号"
										>
											A-
										</button>
										<button
											onClick={() => setFontSize(prev => Math.min(400, prev + 20))}
											className={`px-2.5 py-1 text-xs rounded font-medium ${btnBase}`}
											title="放大字号"
										>
											A+
										</button>
									</div>
								</div>
								
								{/* 字号推荐快捷选择 */}
								<div className="flex flex-wrap gap-1">
									{FONT_SIZES.map(size => (
										<button
											key={size}
											onClick={() => setFontSize(size)}
											className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
												fontSize === size ? 'bg-blue-600 text-white border border-blue-600' : btnBase
											}`}
										>
											{size}
										</button>
									))}
								</div>
							</div>

							<div className="flex items-center gap-3">
								<button
									onClick={handleClear}
									disabled={!text}
									className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-30 ${btnBase}`}
								>
									清空输入
								</button>
								<button
									onClick={() => setDarkMode(d => !d)}
									className={`px-4 py-2.5 text-sm rounded-xl transition-all ${btnBase}`}
									title={darkMode ? '切换到亮色模式' : '切换到深色模式'}
								>
									{darkMode ? '☀️ 亮色' : '🌙 深色'}
								</button>
								<button
									onClick={toggleFullscreen}
									className={`px-4 py-2.5 text-sm rounded-xl transition-all ${btnBase}`}
									title="全屏"
								>
									{isFullscreen ? '退出全屏' : '⛶ 全屏'}
								</button>
							</div>

							{/* 开始展示 按钮 */}
							<button
								onClick={() => {
									if (text.trim()) {
										setStage('display')
									} else {
										inputRef.current?.focus()
									}
								}}
								className={`w-full py-4 text-base font-bold tracking-wider rounded-xl transition-all text-white shadow-md ${
									text.trim()
										? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
										: 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-60'
								}`}
							>
								📢 开始大字展示
							</button>
						</div>
					</div>
				</div>
			) : (
				/* ======================= 大字展示阶段 ======================= */
				<div 
					className={`flex-1 flex flex-col relative justify-center items-center px-10 py-12 select-none cursor-pointer ${bg}`}
					onClick={() => setStage('edit')}
					title="点击任意位置返回编辑配置"
				>
					{/* 展示文本本身 */}
					<div className="max-w-6xl w-full flex items-center justify-center">
						<p
							className={`leading-normal text-center break-all whitespace-pre-wrap font-bold select-text ${textBaseColor}`}
							style={{ fontSize: `${fontSize}px`, letterSpacing: '-0.010em' }}
							onClick={(e) => e.stopPropagation()} // 防止点击文本也退出了，但用户也可以点击背景退出
						>
							{text}
						</p>
					</div>

					{/* 悬浮轻量级控制台 - 在鼠标移动时显示，并在3秒后淡出 */}
					<div 
						className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 ${panelBg} backdrop-blur-md shadow-lg transition-all duration-300 ${
							showFloatingControls ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
						}`}
						onClick={(e) => e.stopPropagation()} // 阻止冒泡，避免点击控制栏退出展示模式
					>
						<button
							onClick={() => setStage('edit')}
							className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
						>
							返回编辑
						</button>
						
						<div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 mx-1" />

						<button
							onClick={() => setFontSize(prev => Math.max(40, prev - 20))}
							className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${btnBase}`}
							title="缩小字号"
						>
							A-
						</button>
						
						<span className={`text-xs font-bold px-1.5 ${textBaseColor}`}>{fontSize}px</span>

						<button
							onClick={() => setFontSize(prev => Math.min(400, prev + 20))}
							className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${btnBase}`}
							title="放大字号"
						>
							A+
						</button>

						<div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 mx-1" />

						<button
							onClick={() => setDarkMode(d => !d)}
							className={`w-7 h-7 rounded-full text-sm flex items-center justify-center ${btnBase}`}
							title={darkMode ? '切换到亮色' : '切换到深色'}
						>
							{darkMode ? '☀️' : '🌙'}
						</button>

						<button
							onClick={toggleFullscreen}
							className={`w-7 h-7 rounded-full text-sm flex items-center justify-center ${btnBase}`}
							title="切换全屏"
						>
							⛶
						</button>
					</div>

					{/* 提示返回的小信息 */}
					<div className={`fixed top-4 right-4 text-xs ${subTextColor} opacity-40 hover:opacity-100 transition-all pointer-events-none select-none`}>
						按 ESC 键或点击空白处可返回
					</div>
				</div>
			)}
		</div>
	)
}
