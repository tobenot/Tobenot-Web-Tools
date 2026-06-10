import { useEffect, useRef, useState } from 'react'

const FONT_SIZES = [80, 120, 160, 200, 240] as const
const DEFAULT_FONT_SIZE = 160

const QUICK_PHRASES = [
	'谢谢',
	'请等一下',
	'我需要帮助',
	'好的',
	'不',
	'疼',
	'水',
	'厕所',
]

export function BigTextTool() {
	const [text, setText] = useState('')
	const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
	const [darkMode, setDarkMode] = useState(true)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const onFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement)
		}
		document.addEventListener('fullscreenchange', onFullscreenChange)
		return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
	}, [])

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
		inputRef.current?.focus()
	}

	const bg = darkMode ? 'bg-gray-950' : 'bg-white'
	const textColor = darkMode ? 'text-white' : 'text-gray-900'
	const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200'
	const subTextColor = darkMode ? 'text-gray-400' : 'text-gray-500'
	const inputBg = darkMode ? 'bg-gray-900 text-white placeholder-gray-600' : 'bg-gray-50 text-gray-900 placeholder-gray-400'
	const btnBase = darkMode
		? 'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
		: 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'

	return (
		<div
			ref={containerRef}
			className={`flex flex-col ${bg} ${isFullscreen ? 'h-screen' : 'min-h-[calc(100vh-120px)]'}`}
		>
			{/* Display area */}
			<div className={`flex-1 flex items-center justify-center px-8 py-10 border-b ${borderColor}`}>
				{text ? (
					<p
						className={`${textColor} leading-tight text-center break-all whitespace-pre-wrap`}
						style={{ fontSize: `${fontSize}px`, fontWeight: 700, letterSpacing: '-0.01em' }}
					>
						{text}
					</p>
				) : (
					<p className={`${subTextColor} text-2xl select-none`}>在下方输入文字…</p>
				)}
			</div>

			{/* Controls */}
			<div className={`shrink-0 ${bg} px-4 pt-4 pb-2 space-y-3`}>
				{/* Quick phrases */}
				<div className="flex flex-wrap gap-2">
					{QUICK_PHRASES.map(phrase => (
						<button
							key={phrase}
							onClick={() => handlePhraseClick(phrase)}
							className={`px-3 py-1.5 text-sm font-medium transition-colors ${btnBase}`}
							style={{ borderRadius: '2px' }}
						>
							{phrase}
						</button>
					))}
				</div>

				{/* Text input */}
				<textarea
					ref={inputRef}
					value={text}
					onChange={e => setText(e.target.value)}
					placeholder="输入文字，上方实时大字展示"
					rows={2}
					autoFocus
					className={`w-full px-4 py-3 text-xl border ${borderColor} ${inputBg} resize-none focus:outline-none focus:ring-2 focus:ring-blue-500`}
					style={{ borderRadius: '2px' }}
				/>

				{/* Toolbar */}
				<div className="flex items-center gap-2 pb-3 flex-wrap">
					{/* Font size */}
					<div className="flex items-center gap-1">
						{FONT_SIZES.map(size => (
							<button
								key={size}
								onClick={() => setFontSize(size)}
								className={`w-8 h-8 text-xs font-bold transition-colors ${
									fontSize === size
										? 'bg-blue-600 text-white border border-blue-600'
										: btnBase
								}`}
								style={{ borderRadius: '2px' }}
								title={`字号 ${size}px`}
							>
								{size / 40}
							</button>
						))}
					</div>

					<div className="flex-1" />

					{/* Clear */}
					<button
						onClick={handleClear}
						disabled={!text}
						className={`px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-30 ${btnBase}`}
						style={{ borderRadius: '2px' }}
					>
						清空
					</button>

					{/* Dark mode toggle */}
					<button
						onClick={() => setDarkMode(d => !d)}
						className={`px-3 py-1.5 text-sm transition-colors ${btnBase}`}
						style={{ borderRadius: '2px' }}
						title={darkMode ? '切换亮色' : '切换暗色'}
					>
						{darkMode ? '☀️' : '🌙'}
					</button>

					{/* Fullscreen */}
					<button
						onClick={toggleFullscreen}
						className={`px-3 py-1.5 text-sm transition-colors ${btnBase}`}
						style={{ borderRadius: '2px' }}
						title={isFullscreen ? '退出全屏' : '全屏展示'}
					>
						{isFullscreen ? '⊠' : '⛶'}
					</button>
				</div>
			</div>
		</div>
	)
}
