import { useEffect, useRef, useState } from 'react'

const FONT_SIZES = [80, 120, 160, 200, 240, 300] as const
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
		phrases: [
			'你好',
			'谢谢',
			'好的',
			'不用了',
			'请稍等',
			'请帮我一下',
			'我听不清，请写字',
			'请再说一遍',
			'多少钱？',
			'在哪里？',
			'卫生间在哪里？',
			'我需要帮助'
		]
	},
	{
		id: 'communication',
		name: '👋 问候沟通',
		phrases: [
			'不好意思',
			'麻烦你了',
			'没关系',
			'请慢一点说',
			'请大声一点',
			'请看手机屏幕',
			'我现在不方便说话',
			'我用文字交流',
			'我马上回来',
			'再见'
		]
	},
	{
		id: 'language',
		name: '🦻 语言与障碍',
		phrases: [
			'我听不懂',
			'我听不清',
			'缄默症',
			'失语症',
			'我说话不方便',
			'我无法说话',
			'请用文字和我交流',
			'请打字给我看',
			'请说慢一点',
			'请说简单一点',
			'请用普通话',
			'我不会说本地方言',
			'I don\'t speak English well',
			'Please write it down',
		]
	},
	{
		id: 'physical',
		name: '🚑 身体与急需',
		phrases: [
			'我不舒服',
			'我头晕',
			'我肚子疼',
			'我胸口不舒服',
			'我需要喝水',
			'我需要吃药',
			'请帮我叫医生',
			'请帮我叫救护车',
			'我要去厕所',
			'我想坐下休息',
			'我想躺下',
			'太冷了',
			'太热了'
		]
	},
	{
		id: 'opinion',
		name: '💡 想法与意见',
		phrases: [
			'可以',
			'不可以',
			'对',
			'不对',
			'同意',
			'不同意',
			'我不知道',
			'我不确定',
			'我想要这个',
			'我不要这个',
			'我还需要想想',
			'请给我选择'
		]
	},
	{
		id: 'tips',
		name: '🗣️ 提示与指示',
		phrases: [
			'请看这里',
			'请让一下',
			'请帮我开门',
			'请帮我拿一下东西',
			'请帮我联系家人',
			'请告诉我地址',
			'请帮我拍照',
			'手机没电了',
			'我需要充电',
			'请不要碰我',
			'请报警'
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
	const editRootRef = useRef<HTMLDivElement>(null)
	const displayRootRef = useRef<HTMLDivElement>(null)

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

	// 展示阶段快捷键：Esc/Enter 退出
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

	// 展示阶段锁定 body 滚动，避免 fixed 覆盖时背后还能滚
	useEffect(() => {
		if (stage === 'display') {
			const prev = document.body.style.overflow
			document.body.style.overflow = 'hidden'
			return () => {
				document.body.style.overflow = prev
			}
		}
	}, [stage])

	function toggleFullscreen() {
		const target = stage === 'display' ? displayRootRef.current : editRootRef.current
		if (!document.fullscreenElement) {
			target?.requestFullscreen?.()
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

	function handleAddCustomPhrase() {
		const trimmed = newPhraseInput.trim()
		if (trimmed && !customPhrases.includes(trimmed)) {
			setCustomPhrases(prev => [...prev, trimmed])
			setNewPhraseInput('')
		}
	}

	function handleDeleteCustomPhrase(phraseToDelete: string, e: React.MouseEvent) {
		e.stopPropagation()
		setCustomPhrases(prev => prev.filter(p => p !== phraseToDelete))
	}

	function startDisplay() {
		if (text.trim()) {
			setStage('display')
		} else {
			inputRef.current?.focus()
		}
	}

	function pulseControls() {
		setShowFloatingControls(true)
		if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
		controlsTimeoutRef.current = setTimeout(() => {
			setShowFloatingControls(false)
		}, 3000)
	}

	function handleDisplayMouseMove() {
		if (stage !== 'display') return
		pulseControls()
	}

	// 切换到 display 阶段时，默认显示控制栏并在 3 秒后淡出
	useEffect(() => {
		if (stage === 'display') {
			pulseControls()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stage])

	useEffect(() => {
		return () => {
			if (controlsTimeoutRef.current) {
				clearTimeout(controlsTimeoutRef.current)
			}
		}
	}, [])

	// 显示顺序：⭐ 常用 → 🏷️ 我的（自定义） → 其余分组
	const orderedCategories: PhraseCategory[] = [
		STATIC_CATEGORIES[0],
		{
			id: 'custom',
			name: '🏷️ 我的短语',
			phrases: customPhrases
		},
		...STATIC_CATEGORIES.slice(1)
	]

	// 样式相关
	const bg = darkMode ? 'bg-gray-950' : 'bg-gray-50'
	const textBaseColor = darkMode ? 'text-gray-100' : 'text-gray-900'
	const borderColor = darkMode ? 'border-gray-800' : 'border-gray-200'
	const subTextColor = darkMode ? 'text-gray-400' : 'text-gray-500'
	const inputBg = darkMode
		? 'bg-gray-900 text-white placeholder-gray-600 border-gray-800'
		: 'bg-white text-gray-900 placeholder-gray-400 border-gray-200'
	const panelBg = darkMode ? 'bg-gray-900/70' : 'bg-white/80'
	const stickyBg = darkMode ? 'bg-gray-950/95' : 'bg-gray-50/95'

	const btnBase = darkMode
		? 'border border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800 active:bg-gray-700'
		: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'

	const activeBtnBase = darkMode
		? 'border-blue-600 bg-blue-950/40 text-blue-400'
		: 'border-blue-500 bg-blue-50 text-blue-600'

	return (
		<>
			{/* ======================= 编辑阶段：占满 main 容器 ======================= */}
			<div
				ref={editRootRef}
				className={`h-full flex flex-col ${bg} ${textBaseColor} transition-colors duration-300`}
			>
				{/* 顶部 sticky：输入框 + 主 CTA */}
				<div className={`shrink-0 border-b ${borderColor} ${stickyBg} backdrop-blur-md`}>
					<div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
						<div className="flex flex-col sm:flex-row gap-2 items-stretch">
							<textarea
								ref={inputRef}
								value={text}
								onChange={e => setText(e.target.value)}
								placeholder="点击下方短语自动填入，或直接在这里输入..."
								rows={2}
								autoFocus
								className={`flex-1 px-4 py-2.5 text-base sm:text-lg border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
							/>
							<div className="flex sm:flex-col gap-2 sm:w-44 shrink-0">
								<button
									onClick={startDisplay}
									disabled={!text.trim()}
									className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-3 text-base font-bold rounded-xl transition-all text-white shadow-md whitespace-nowrap ${
										text.trim()
											? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] cursor-pointer'
											: 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-60'
									}`}
								>
									📢 开始展示
								</button>
								<button
									onClick={handleClear}
									disabled={!text}
									className={`px-3 py-2 text-sm rounded-xl transition-colors disabled:opacity-30 ${btnBase}`}
									title="清空输入"
								>
									清空
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* 滚动主区：所有分组平铺，无横滑切换 */}
				<div className="flex-1 overflow-y-auto">
					<div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-5">
						{orderedCategories.map(cat => (
							<section key={cat.id}>
								<div className="flex items-baseline justify-between mb-2">
									<h3 className={`text-sm sm:text-base font-bold ${textBaseColor}`}>
										{cat.name}
									</h3>
									{cat.id === 'custom' && customPhrases.length > 0 && (
										<span className={`text-[10px] ${subTextColor}`}>
											共 {customPhrases.length} 条 · 点 ✕ 删除
										</span>
									)}
								</div>

								{cat.id === 'custom' && (
									<div className="flex gap-2 mb-2.5">
										<input
											type="text"
											value={newPhraseInput}
											onChange={e => setNewPhraseInput(e.target.value)}
											onKeyDown={e => e.key === 'Enter' && handleAddCustomPhrase()}
											placeholder="新增常用短语..."
											className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
										/>
										<button
											onClick={handleAddCustomPhrase}
											disabled={!newPhraseInput.trim()}
											className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											添加
										</button>
									</div>
								)}

								{cat.phrases.length === 0 ? (
									<p className={`text-xs ${subTextColor} py-2`}>
										{cat.id === 'custom'
											? '还没有自定义短语，添加几个您最常说的话吧'
											: '暂无内容'}
									</p>
								) : (
									<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
										{cat.phrases.map((phrase, idx) => (
											<button
												key={idx}
												onClick={() => handlePhraseClick(phrase)}
												className={`group relative flex items-center justify-between text-left p-3 sm:p-3.5 text-sm sm:text-base font-medium rounded-xl border transition-all active:scale-[0.97] ${
													text === phrase ? activeBtnBase : btnBase
												}`}
											>
												<span className="break-all line-clamp-2 leading-snug pr-1 flex-1">
													{phrase}
												</span>
												{cat.id === 'custom' && (
													<span
														role="button"
														onClick={(e) => handleDeleteCustomPhrase(phrase, e)}
														className="ml-1 opacity-50 hover:opacity-100 hover:text-red-500 active:text-red-600 shrink-0 p-1 cursor-pointer"
														title="删除"
													>
														<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
														</svg>
													</span>
												)}
											</button>
										))}
									</div>
								)}
							</section>
						))}
					</div>
				</div>

				{/* 底部 sticky：字号 + 主题/全屏 */}
				<div className={`shrink-0 border-t ${borderColor} ${stickyBg} backdrop-blur-md`}>
					<div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-2 flex-wrap">
						<span className={`text-xs font-semibold ${subTextColor} hidden sm:inline`}>字号</span>
						<button
							onClick={() => setFontSize(prev => Math.max(40, prev - 20))}
							className={`px-3 py-1.5 text-xs font-bold rounded-md ${btnBase}`}
							title="缩小"
						>
							A-
						</button>
						<span className={`text-xs font-bold tabular-nums px-1 min-w-[42px] text-center ${textBaseColor}`}>
							{fontSize}px
						</span>
						<button
							onClick={() => setFontSize(prev => Math.min(400, prev + 20))}
							className={`px-3 py-1.5 text-xs font-bold rounded-md ${btnBase}`}
							title="放大"
						>
							A+
						</button>

						<div className="hidden md:flex gap-1 ml-2">
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

						<div className="ml-auto flex items-center gap-1.5 sm:gap-2">
							<button
								onClick={() => setDarkMode(d => !d)}
								className={`px-3 py-1.5 text-xs rounded-md transition-colors ${btnBase}`}
								title={darkMode ? '切换到亮色' : '切换到深色'}
							>
								{darkMode ? '☀️' : '🌙'}
							</button>
							<button
								onClick={toggleFullscreen}
								className={`px-3 py-1.5 text-xs rounded-md transition-colors ${btnBase}`}
								title={isFullscreen ? '退出全屏' : '全屏'}
							>
								⛶
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* ======================= 展示阶段：fixed 全屏覆盖（盖住 Header） ======================= */}
			{stage === 'display' && (
				<div
					ref={displayRootRef}
					className={`fixed inset-0 z-[100] ${bg} flex items-center justify-center select-none cursor-pointer overflow-hidden`}
					onMouseMove={handleDisplayMouseMove}
					onClick={() => {
						setShowFloatingControls(prev => {
							const next = !prev
							if (next) {
								if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
								controlsTimeoutRef.current = setTimeout(() => {
									setShowFloatingControls(false)
								}, 3000)
							}
							return next
						})
					}}
				>
					{/* 大字本身：双击直接退出展示 */}
					<p
						className={`leading-tight text-center break-all whitespace-pre-wrap font-bold select-text px-4 ${textBaseColor}`}
						style={{ fontSize: `${fontSize}px`, letterSpacing: '-0.010em' }}
						onClick={(e) => {
							e.stopPropagation()
							setShowFloatingControls(prev => {
								const next = !prev
								if (next) {
									if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
									controlsTimeoutRef.current = setTimeout(() => {
										setShowFloatingControls(false)
									}, 3000)
								}
								return next
							})
						}}
						onDoubleClick={(e) => {
							e.stopPropagation()
							setStage('edit')
						}}
					>
						{text}
					</p>

					{/* 左上角常驻返回按钮：默认半透明，hover/控制栏激活时全显 */}
					<button
						onClick={(e) => { e.stopPropagation(); setStage('edit') }}
						className={`fixed top-3 left-3 z-[110] px-3 py-2 text-xs font-bold rounded-full backdrop-blur-md transition-opacity duration-300 ${
							showFloatingControls ? 'opacity-100' : 'opacity-25 hover:opacity-100 focus:opacity-100'
						} ${darkMode ? 'bg-gray-900/70 text-gray-100 border border-gray-700' : 'bg-white/80 text-gray-900 border border-gray-200'}`}
						title="返回编辑 (Esc)"
					>
						← 返回
					</button>

					{/* 底部悬浮控制栏 */}
					<div
						className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-3 py-2 rounded-full border ${borderColor} ${panelBg} backdrop-blur-md shadow-lg transition-all duration-300 ${
							showFloatingControls ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
						}`}
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => setStage('edit')}
							className="px-4 py-2 text-xs sm:text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shrink-0"
						>
							返回编辑
						</button>

						<div className="w-[1px] h-5 bg-gray-300 dark:bg-gray-700 mx-1 shrink-0" />

						<button
							onClick={() => setFontSize(prev => Math.max(40, prev - 20))}
							className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${btnBase}`}
							title="缩小字号"
						>
							A-
						</button>
						<span className={`text-xs sm:text-sm font-bold px-1 shrink-0 tabular-nums ${textBaseColor}`}>
							{fontSize}
						</span>
						<button
							onClick={() => setFontSize(prev => Math.min(400, prev + 20))}
							className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${btnBase}`}
							title="放大字号"
						>
							A+
						</button>

						<div className="w-[1px] h-5 bg-gray-300 dark:bg-gray-700 mx-1 shrink-0" />

						<button
							onClick={() => setDarkMode(d => !d)}
							className={`w-9 h-9 rounded-full text-sm flex items-center justify-center shrink-0 ${btnBase}`}
							title={darkMode ? '切换到亮色' : '切换到深色'}
						>
							{darkMode ? '☀️' : '🌙'}
						</button>
						<button
							onClick={toggleFullscreen}
							className={`w-9 h-9 rounded-full text-sm flex items-center justify-center shrink-0 ${btnBase}`}
							title="切换全屏"
						>
							⛶
						</button>
					</div>

					{/* 右上角小提示 */}
					<div className={`fixed top-3 right-3 z-[105] text-[10px] sm:text-xs ${subTextColor} ${
						showFloatingControls ? 'opacity-70' : 'opacity-30'
					} transition-opacity duration-300 pointer-events-none select-none text-right leading-relaxed`}>
						<div>双击文字 / Esc 直接返回</div>
						<div>点击屏幕显示/隐藏控制栏</div>
					</div>
				</div>
			)}
		</>
	)
}
