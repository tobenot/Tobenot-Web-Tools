import { useCallback, useRef, useState } from 'react'
import JSZip from 'jszip'

interface ImageItem {
	id: string
	file: File
	originalUrl: string
	webpUrl: string | null
	webpSize: number | null
	processing: boolean
}

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / 1048576).toFixed(1)} MB`
}

function webpFileName(originalName: string): string {
	const dot = originalName.lastIndexOf('.')
	const base = dot >= 0 ? originalName.slice(0, dot) : originalName
	return `${base}.webp`
}

function estimateDataUrlSize(dataUrl: string): number {
	const base64 = dataUrl.split(',')[1] ?? ''
	return Math.round(base64.length * 0.75)
}

function convertToWebP(imageUrl: string, quality: number): Promise<{ dataUrl: string; size: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => {
			const canvas = document.createElement('canvas')
			canvas.width = img.width
			canvas.height = img.height
			const ctx = canvas.getContext('2d')
			if (!ctx) {
				reject(new Error('canvas context unavailable'))
				return
			}
			ctx.drawImage(img, 0, 0)
			const dataUrl = canvas.toDataURL('image/webp', quality)
			resolve({ dataUrl, size: estimateDataUrlSize(dataUrl) })
		}
		img.onerror = () => reject(new Error('image load failed'))
		img.src = imageUrl
	})
}

export function ImageToWebpTool() {
	const [images, setImages] = useState<ImageItem[]>([])
	const [quality, setQuality] = useState(80)
	const [converting, setConverting] = useState(false)
	const [zipping, setZipping] = useState(false)
	const [status, setStatus] = useState('')
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleFiles = useCallback((files: FileList | File[]) => {
		const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
		if (fileArray.length === 0) {
			setStatus('请选择有效的图片文件')
			return
		}

		const newItems: ImageItem[] = fileArray.map(file => ({
			id: generateId(),
			file,
			originalUrl: URL.createObjectURL(file),
			webpUrl: null,
			webpSize: null,
			processing: false,
		}))

		setImages(prev => [...prev, ...newItems])
		setStatus(`已选择 ${fileArray.length} 个文件`)
	}, [])

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (e.dataTransfer.files.length > 0) {
			handleFiles(e.dataTransfer.files)
		}
	}, [handleFiles])

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	const convertAll = useCallback(async () => {
		if (images.length === 0) return

		setConverting(true)
		setStatus('正在转换...')

		const qualityNormalized = quality / 100

		for (const image of images) {
			setImages(prev => prev.map(item =>
				item.id === image.id ? { ...item, processing: true } : item
			))

			try {
				const { dataUrl, size } = await convertToWebP(image.originalUrl, qualityNormalized)
				setImages(prev => prev.map(item =>
					item.id === image.id
						? { ...item, webpUrl: dataUrl, webpSize: size, processing: false }
						: item
				))
			} catch {
				setImages(prev => prev.map(item =>
					item.id === image.id ? { ...item, processing: false } : item
				))
			}
		}

		setConverting(false)
		setStatus(`已完成 ${images.length} 个文件的转换`)
	}, [images, quality])

	const downloadSingle = useCallback((image: ImageItem) => {
		if (!image.webpUrl) return
		const link = document.createElement('a')
		link.href = image.webpUrl
		link.download = webpFileName(image.file.name)
		link.click()
	}, [])

	const downloadAll = useCallback(async () => {
		const converted = images.filter(img => img.webpUrl)
		if (converted.length === 0) return

		setZipping(true)
		try {
			const zip = new JSZip()
			const folder = zip.folder('webp_images')
			if (!folder) return

			for (const image of converted) {
				const res = await fetch(image.webpUrl!)
				const blob = await res.blob()
				folder.file(webpFileName(image.file.name), blob)
			}

			const content = await zip.generateAsync({ type: 'blob' })
			const url = URL.createObjectURL(content)
			const link = document.createElement('a')
			link.href = url
			link.download = 'converted_images.zip'
			link.click()
			URL.revokeObjectURL(url)
		} finally {
			setZipping(false)
		}
	}, [images])

	const clearAll = useCallback(() => {
		images.forEach(img => {
			URL.revokeObjectURL(img.originalUrl)
		})
		setImages([])
		setStatus('')
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}, [images])

	const convertedCount = images.filter(img => img.webpUrl).length

	return (
		<div className="space-y-6">
			<div className="relative bg-white border-2 border-gray-200">
				<div
					className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none"
					style={{
						background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
						backgroundSize: '300% 100%',
						animation: 'gradient-flow 12s linear infinite',
					}}
				/>
				<div className="p-6">
					<div className="flex items-center gap-3">
						<div className="text-2xl">🖼️</div>
						<div>
							<h2 className="text-xl font-bold tracking-wide text-gray-900">图片批量转 WebP</h2>
							<p className="text-sm text-gray-600 mt-1">
								批量将 PNG / JPG 等图片转换为 WebP，支持质量调节与 ZIP 打包下载
							</p>
						</div>
					</div>
				</div>
			</div>

			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onClick={() => fileInputRef.current?.click()}
				className="border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-lg p-8 text-center cursor-pointer transition-colors"
			>
				<div className="text-4xl mb-2">📁</div>
				<p className="text-sm font-medium text-gray-700">将图片拖放到此处或点击选择文件</p>
				<p className="text-xs text-gray-500 mt-1">支持批量添加</p>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					multiple
					className="hidden"
					onChange={(e) => e.target.files && handleFiles(e.target.files)}
				/>
			</div>

			<div className="border-2 border-gray-200 bg-white p-4 space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold text-gray-700">WebP 质量</h3>
					<span className="text-sm font-mono text-blue-600">{quality}%</span>
				</div>
				<input
					type="range"
					min={0}
					max={100}
					value={quality}
					onChange={(e) => setQuality(Number(e.target.value))}
					className="w-full accent-blue-500"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>最小 (0)</span>
					<span>推荐 (80)</span>
					<span>最大 (100)</span>
				</div>
			</div>

			<div className="flex flex-wrap gap-3">
				<button
					onClick={convertAll}
					disabled={images.length === 0 || converting}
					className="flex-1 min-w-[140px] px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
				>
					{converting ? '转换中...' : '转换为 WebP'}
				</button>
				<button
					onClick={clearAll}
					disabled={images.length === 0 || converting}
					className="flex-1 min-w-[100px] px-4 py-2.5 text-sm font-medium border-2 border-gray-200 bg-white text-gray-700 rounded hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					清空
				</button>
				{convertedCount > 0 && (
					<button
						onClick={downloadAll}
						disabled={zipping}
						className="flex-1 min-w-[160px] px-4 py-2.5 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
					>
						{zipping ? '打包中...' : `下载全部 (${convertedCount})`}
					</button>
				)}
			</div>

			{status && (
				<p className="text-sm text-center font-medium text-blue-600">{status}</p>
			)}

			{images.length > 0 && (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{images.map(image => {
						const compressionRatio = image.webpSize != null
							? (100 - (image.webpSize / image.file.size * 100)).toFixed(1)
							: null

						return (
							<div key={image.id} className="border-2 border-gray-200 bg-white rounded p-3 space-y-2">
								<div className="aspect-square bg-gray-50 rounded overflow-hidden flex items-center justify-center">
									<img
										src={image.webpUrl ?? image.originalUrl}
										alt={image.file.name}
										className="max-w-full max-h-full object-contain"
									/>
								</div>
								<div className="text-xs text-gray-600 space-y-1">
									<p className="truncate font-medium" title={image.file.name}>
										{image.webpUrl ? webpFileName(image.file.name) : image.file.name}
									</p>
									<p>
										{image.webpSize != null
											? `${formatFileSize(image.webpSize)}，减少 ${compressionRatio}%`
											: formatFileSize(image.file.size)}
									</p>
									{image.processing && (
										<p className="text-blue-500 animate-pulse">转换中</p>
									)}
								</div>
								{image.webpUrl && (
									<button
										onClick={() => downloadSingle(image)}
										className="w-full px-2 py-1.5 text-xs font-medium border border-gray-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors"
									>
										下载
									</button>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
