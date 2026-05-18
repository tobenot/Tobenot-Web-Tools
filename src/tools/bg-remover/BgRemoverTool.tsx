import { useCallback, useEffect, useRef, useState } from 'react'

/* ─── 类型 ─── */
type RGB = [number, number, number]

interface ImageItem {
  id: string
  file: File
  originalUrl: string
  processedUrl: string | null
  width: number
  height: number
  processing: boolean
  /** 用户手动指定的底色（取色 / 手动输入），优先级最高 */
  customColor: RGB | null
  /** 自动检测到的底色（角落采样） */
  detectedColor: RGB | null
}

interface RemoveConfig {
  targetColor: RGB
  tolerance: number
  feather: number
}

/** 批量处理模式 */
type BatchColorMode = 'global' | 'auto' | 'perImage'

/* ─── 工具函数 ─── */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [255, 255, 255]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * 自动检测图片底色：
 * 从四个角和四边中点采样，取出现频率最高的颜色簇的平均值
 */
function detectBackgroundColor(imageUrl: string): Promise<RGB> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const w = img.width
      const h = img.height
      // 采样点：四角 + 四边中点 + 角落区域多点
      const sampleSize = 5 // 每个角采样 sampleSize × sampleSize 区域
      const samplePoints: Array<[number, number]> = []

      // 四个角落区域
      for (let dx = 0; dx < sampleSize; dx++) {
        for (let dy = 0; dy < sampleSize; dy++) {
          samplePoints.push([dx, dy]) // 左上
          samplePoints.push([w - 1 - dx, dy]) // 右上
          samplePoints.push([dx, h - 1 - dy]) // 左下
          samplePoints.push([w - 1 - dx, h - 1 - dy]) // 右下
        }
      }
      // 四边中点
      samplePoints.push([Math.floor(w / 2), 0])
      samplePoints.push([Math.floor(w / 2), h - 1])
      samplePoints.push([0, Math.floor(h / 2)])
      samplePoints.push([w - 1, Math.floor(h / 2)])

      // 收集像素颜色
      const colors: RGB[] = []
      for (const [x, y] of samplePoints) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const pixel = ctx.getImageData(x, y, 1, 1).data
          colors.push([pixel[0], pixel[1], pixel[2]])
        }
      }

      if (colors.length === 0) {
        resolve([255, 255, 255])
        return
      }

      // 简单聚类：找出最大色彩簇（容差 30 内算同一类）
      const clusters: { colors: RGB[]; center: RGB }[] = []
      const clusterTolerance = 30

      for (const color of colors) {
        let found = false
        for (const cluster of clusters) {
          const dist = colorDistance(...color, ...cluster.center)
          if (dist <= clusterTolerance) {
            cluster.colors.push(color)
            // 更新中心
            const len = cluster.colors.length
            cluster.center = [
              Math.round(cluster.colors.reduce((s, c) => s + c[0], 0) / len),
              Math.round(cluster.colors.reduce((s, c) => s + c[1], 0) / len),
              Math.round(cluster.colors.reduce((s, c) => s + c[2], 0) / len),
            ]
            found = true
            break
          }
        }
        if (!found) {
          clusters.push({ colors: [color], center: [...color] })
        }
      }

      // 取最大簇的中心色
      clusters.sort((a, b) => b.colors.length - a.colors.length)
      resolve(clusters[0].center)
    }
    img.onerror = () => resolve([255, 255, 255])
    img.src = imageUrl
  })
}

/* ─── 去底处理核心 ─── */
function removeBackground(
  imageData: ImageData,
  config: RemoveConfig
): ImageData {
  const { targetColor, tolerance, feather } = config
  const [tr, tg, tb] = targetColor
  const data = imageData.data
  const maxDist = Math.sqrt(255 ** 2 * 3) // ~441.67

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const dist = colorDistance(r, g, b, tr, tg, tb)

    if (dist <= tolerance) {
      // 完全透明
      data[i + 3] = 0
    } else if (feather > 0 && dist <= tolerance + feather) {
      // 羽化区域：渐变透明
      const alpha = ((dist - tolerance) / feather) * 255
      data[i + 3] = Math.min(data[i + 3], Math.round(alpha))
    }
    // else: 保持原样
  }

  return imageData
}

/* ─── 处理单张图片 ─── */
async function processImage(
  imageUrl: string,
  config: RemoveConfig
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const processed = removeBackground(imageData, config)
      ctx.putImageData(processed, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = imageUrl
  })
}

/* ─── 组件 ─── */
export function BgRemoverTool() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [config, setConfig] = useState<RemoveConfig>({
    targetColor: [255, 255, 255],
    tolerance: 30,
    feather: 10,
  })
  const [pickingColor, setPickingColor] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchColorMode, setBatchColorMode] = useState<BatchColorMode>('auto')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const colorPickCanvasRef = useRef<HTMLCanvasElement>(null)

  const hexColor = rgbToHex(...config.targetColor)

  /* 文件选择处理 */
  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))

    fileArray.forEach(file => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const item: ImageItem = {
          id: generateId(),
          file,
          originalUrl: url,
          processedUrl: null,
          width: img.width,
          height: img.height,
          processing: false,
          customColor: null,
          detectedColor: null,
        }
        setImages(prev => [...prev, item])
        setSelectedImageId(prev => prev ?? item.id)

        // 异步自动检测底色
        detectBackgroundColor(url).then(detected => {
          setImages(prev => prev.map(i =>
            i.id === item.id ? { ...i, detectedColor: detected } : i
          ))
        })
      }
      img.src = url
    })
  }, [])

  /* 拖放处理 */
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

  /* 取色功能 — 同时更新全局 config 和当前图片的 customColor */
  const handleColorPick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pickingColor) return
    const canvas = colorPickCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width))
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
    const ctx = canvas.getContext('2d')!
    const pixel = ctx.getImageData(x, y, 1, 1).data
    const pickedColor: RGB = [pixel[0], pixel[1], pixel[2]]
    setConfig(prev => ({ ...prev, targetColor: pickedColor }))
    // 同时绑定到当前选中图片
    if (selectedImageId) {
      setImages(prev => prev.map(img =>
        img.id === selectedImageId ? { ...img, customColor: pickedColor } : img
      ))
    }
    setPickingColor(false)
  }, [pickingColor, selectedImageId])

  /* 绘制取色画布 */
  const selectedImage = images.find(img => img.id === selectedImageId)

  useEffect(() => {
    if (!selectedImage || !colorPickCanvasRef.current) return
    const canvas = colorPickCanvasRef.current
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
    }
    img.src = selectedImage.originalUrl
  }, [selectedImage?.originalUrl])

  /** 获取某张图片实际使用的目标色 */
  const getEffectiveColor = useCallback((image: ImageItem): RGB => {
    // 优先级：customColor > (auto模式: detectedColor) > 全局 config
    if (image.customColor) return image.customColor
    if (batchColorMode === 'auto' && image.detectedColor) return image.detectedColor
    return config.targetColor
  }, [batchColorMode, config.targetColor])

  /* 处理单张 */
  const processSingle = useCallback(async (imageId: string) => {
    const target = images.find(img => img.id === imageId)
    if (!target) return
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, processing: true } : img
    ))
    try {
      const effectiveColor = getEffectiveColor(target)
      const effectiveConfig: RemoveConfig = { ...config, targetColor: effectiveColor }
      const result = await processImage(target.originalUrl, effectiveConfig)
      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, processedUrl: result, processing: false } : img
      ))
    } catch {
      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, processing: false } : img
      ))
    }
  }, [config, images, getEffectiveColor])

  /* 批量处理 — 每张图使用各自的有效颜色 */
  const processAll = useCallback(async () => {
    setBatchProcessing(true)
    for (const image of images) {
      setImages(prev => prev.map(img =>
        img.id === image.id ? { ...img, processing: true } : img
      ))
      try {
        const effectiveColor = getEffectiveColor(image)
        const effectiveConfig: RemoveConfig = { ...config, targetColor: effectiveColor }
        const result = await processImage(image.originalUrl, effectiveConfig)
        setImages(prev => prev.map(img =>
          img.id === image.id ? { ...img, processedUrl: result, processing: false } : img
        ))
      } catch {
        setImages(prev => prev.map(img =>
          img.id === image.id ? { ...img, processing: false } : img
        ))
      }
    }
    setBatchProcessing(false)
  }, [config, images, getEffectiveColor])

  /* 下载单张 */
  const downloadSingle = useCallback((image: ImageItem) => {
    if (!image.processedUrl) return
    const link = document.createElement('a')
    link.download = `去底_${image.file.name.replace(/\.[^.]+$/, '')}.png`
    link.href = image.processedUrl
    link.click()
  }, [])

  /* 下载全部 */
  const downloadAll = useCallback(() => {
    const processed = images.filter(img => img.processedUrl)
    processed.forEach((image, index) => {
      setTimeout(() => {
        downloadSingle(image)
      }, index * 300)
    })
  }, [images, downloadSingle])

  /* 删除图片 */
  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id)
      if (selectedImageId === id) {
        setSelectedImageId(updated[0]?.id ?? null)
      }
      return updated
    })
  }, [selectedImageId])

  /* 清空全部 */
  const clearAll = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.originalUrl))
    setImages([])
    setSelectedImageId(null)
  }, [images])

  /* 快捷预设 */
  const presetWhite = useCallback(() => {
    setConfig(prev => ({ ...prev, targetColor: [255, 255, 255], tolerance: 30, feather: 10 }))
  }, [])

  const presetBlack = useCallback(() => {
    setConfig(prev => ({ ...prev, targetColor: [0, 0, 0], tolerance: 30, feather: 10 }))
  }, [])

  const presetGreen = useCallback(() => {
    setConfig(prev => ({ ...prev, targetColor: [0, 177, 64], tolerance: 50, feather: 15 }))
  }, [])

  return (
    <div className="space-y-6">
      {/* 标题区 */}
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
              <h2 className="text-xl font-bold tracking-wide text-gray-900">图片去底工具</h2>
              <p className="text-sm text-gray-600 mt-1">
                批量去除图片背景底色，支持取色、容差调节与边缘羽化
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左栏：上传 + 图片列表 */}
        <div className="space-y-4">
          {/* 上传区域 */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-lg p-8 text-center cursor-pointer transition-colors"
          >
            <div className="text-4xl mb-2">📁</div>
            <p className="text-sm font-medium text-gray-700">点击或拖放图片到此处</p>
            <p className="text-xs text-gray-500 mt-1">支持 PNG / JPG / WebP / BMP 等格式，可批量添加</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* 图片列表 */}
          {images.length > 0 && (
            <div className="border-2 border-gray-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">
                  已添加 {images.length} 张图片
                </span>
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  清空全部
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {images.map(img => (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImageId(img.id)}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                      selectedImageId === img.id
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <img
                      src={img.originalUrl}
                      alt=""
                      className="w-10 h-10 object-cover rounded border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{img.file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{img.width}×{img.height}</span>
                        {/* 显示该图片使用的底色 */}
                        {(img.customColor || img.detectedColor) && (
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-gray-300 shrink-0"
                            style={{ backgroundColor: rgbToHex(...(img.customColor || img.detectedColor!)) }}
                            title={img.customColor ? '手动指定底色' : '自动检测底色'}
                          />
                        )}
                        {img.customColor && (
                          <span className="text-xs text-blue-500" title="手动指定">🎯</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {img.processing && (
                        <span className="text-xs text-blue-500 animate-pulse">处理中</span>
                      )}
                      {img.processedUrl && !img.processing && (
                        <span className="text-xs text-green-600">✓</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                        className="text-gray-400 hover:text-red-500 text-sm"
                        title="移除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 中栏：预览 */}
        <div className="space-y-4">
          {selectedImage ? (
            <div className="border-2 border-gray-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">预览</span>
                <div className="flex items-center gap-2">
                  {pickingColor && (
                    <span className="text-xs text-orange-600 font-medium animate-pulse">
                      🎯 点击图片取色
                    </span>
                  )}
                  <button
                    onClick={() => setPickingColor(!pickingColor)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      pickingColor
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    💧 取色
                  </button>
                </div>
              </div>

              {/* 取色用 Canvas */}
              <div
                className="relative overflow-auto"
                style={{
                  maxHeight: '400px',
                  backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)',
                  backgroundSize: '16px 16px',
                }}
              >
                <canvas
                  ref={colorPickCanvasRef}
                  onClick={handleColorPick}
                  className={`max-w-full h-auto ${pickingColor ? 'cursor-crosshair' : 'cursor-default'}`}
                  style={{ display: 'block', margin: '0 auto' }}
                />
              </div>

              {/* 处理后预览 */}
              {selectedImage.processedUrl && (
                <div className="border-t border-gray-100">
                  <div className="px-4 py-2 bg-green-50">
                    <span className="text-xs font-medium text-green-700">✓ 去底结果</span>
                  </div>
                  <div
                    className="overflow-auto"
                    style={{
                      maxHeight: '300px',
                      backgroundImage: 'repeating-conic-gradient(#d1d5db 0% 25%, #f9fafb 0% 50%)',
                      backgroundSize: '16px 16px',
                    }}
                  >
                    <img
                      src={selectedImage.processedUrl}
                      alt="处理结果"
                      className="max-w-full h-auto block mx-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-lg flex items-center justify-center h-64">
              <p className="text-sm text-gray-500">请先添加图片</p>
            </div>
          )}
        </div>

        {/* 右栏：参数配置 + 操作 */}
        <div className="space-y-4">
          {/* 快捷预设 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">⚡ 快捷预设</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={presetWhite}
                className="px-3 py-2 text-xs font-medium border-2 border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                ⬜ 去白底
              </button>
              <button
                onClick={presetBlack}
                className="px-3 py-2 text-xs font-medium border-2 border-gray-200 bg-gray-900 text-white hover:border-blue-400 transition-colors"
              >
                ⬛ 去黑底
              </button>
              <button
                onClick={presetGreen}
                className="px-3 py-2 text-xs font-medium border-2 border-gray-200 bg-green-500 text-white hover:border-blue-400 transition-colors"
              >
                🟩 去绿幕
              </button>
            </div>
          </div>

          {/* 颜色配置 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">🎨 目标底色</h3>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={hexColor}
                onChange={(e) => setConfig(prev => ({ ...prev, targetColor: hexToRgb(e.target.value) }))}
                className="w-10 h-10 border-2 border-gray-300 rounded cursor-pointer"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={hexColor}
                  onChange={(e) => {
                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                      setConfig(prev => ({ ...prev, targetColor: hexToRgb(e.target.value) }))
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 font-mono focus:border-blue-400 focus:outline-none"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500">
              RGB: ({config.targetColor[0]}, {config.targetColor[1]}, {config.targetColor[2]})
            </div>
          </div>

          {/* 容差 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">🎚️ 容差</h3>
              <span className="text-sm font-mono text-blue-600">{config.tolerance}</span>
            </div>
            <input
              type="range"
              min={0}
              max={150}
              value={config.tolerance}
              onChange={(e) => setConfig(prev => ({ ...prev, tolerance: Number(e.target.value) }))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>精确 (0)</span>
              <span>宽松 (150)</span>
            </div>
            <p className="text-xs text-gray-500">
              容差越大，与目标色相近的颜色也会被去除。建议范围 20~60。
            </p>
          </div>

          {/* 边缘羽化 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">🌫️ 边缘羽化</h3>
              <span className="text-sm font-mono text-blue-600">{config.feather}</span>
            </div>
            <input
              type="range"
              min={0}
              max={80}
              value={config.feather}
              onChange={(e) => setConfig(prev => ({ ...prev, feather: Number(e.target.value) }))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>硬边缘 (0)</span>
              <span>柔边缘 (80)</span>
            </div>
            <p className="text-xs text-gray-500">
              羽化使边缘过渡更柔和，避免锯齿感。推荐 5~20。
            </p>
          </div>

          {/* 批量颜色模式 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">🔄 批量处理颜色策略</h3>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="batchColorMode"
                  value="auto"
                  checked={batchColorMode === 'auto'}
                  onChange={() => setBatchColorMode('auto')}
                  className="mt-0.5 accent-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">自动检测</span>
                  <p className="text-xs text-gray-500">每张图自动从角落采样推断底色（推荐）</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="batchColorMode"
                  value="global"
                  checked={batchColorMode === 'global'}
                  onChange={() => setBatchColorMode('global')}
                  className="mt-0.5 accent-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">统一颜色</span>
                  <p className="text-xs text-gray-500">所有图片使用上方设置的同一目标色</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="batchColorMode"
                  value="perImage"
                  checked={batchColorMode === 'perImage'}
                  onChange={() => setBatchColorMode('perImage')}
                  className="mt-0.5 accent-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">逐张取色</span>
                  <p className="text-xs text-gray-500">使用你为每张图手动取色的结果（未取色的用全局色）</p>
                </div>
              </label>
            </div>

            {/* 当前图片的有效底色预览 */}
            {selectedImage && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>当前图片将使用：</span>
                  <span
                    className="inline-block w-5 h-5 rounded border border-gray-300"
                    style={{ backgroundColor: rgbToHex(...getEffectiveColor(selectedImage)) }}
                  />
                  <span className="font-mono">{rgbToHex(...getEffectiveColor(selectedImage))}</span>
                  {selectedImage.customColor && <span className="text-blue-500">(手动)</span>}
                  {!selectedImage.customColor && batchColorMode === 'auto' && selectedImage.detectedColor && (
                    <span className="text-green-600">(自动检测)</span>
                  )}
                  {!selectedImage.customColor && batchColorMode === 'global' && (
                    <span className="text-gray-400">(全局)</span>
                  )}
                </div>
                {selectedImage.customColor && (
                  <button
                    onClick={() => {
                      setImages(prev => prev.map(img =>
                        img.id === selectedImageId ? { ...img, customColor: null } : img
                      ))
                    }}
                    className="mt-1 text-xs text-red-500 hover:text-red-700"
                  >
                    清除手动指定 → 恢复自动
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">🚀 操作</h3>
            <div className="space-y-2">
              {selectedImageId && (
                <button
                  onClick={() => processSingle(selectedImageId)}
                  disabled={batchProcessing || images.find(i => i.id === selectedImageId)?.processing}
                  className="w-full px-4 py-2.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  处理当前图片
                </button>
              )}
              <button
                onClick={processAll}
                disabled={batchProcessing || images.length === 0}
                className="w-full px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {batchProcessing ? '批量处理中...' : `批量处理全部 (${images.length}张)`}
              </button>

              <div className="border-t border-gray-100 pt-2 space-y-2">
                {selectedImage?.processedUrl && (
                  <button
                    onClick={() => downloadSingle(selectedImage)}
                    className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    下载当前结果
                  </button>
                )}
                {images.some(img => img.processedUrl) && (
                  <button
                    onClick={downloadAll}
                    className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                  >
                    下载全部结果 ({images.filter(i => i.processedUrl).length}张)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="border-2 border-gray-200 bg-white p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">💡 使用技巧</h3>
        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
          <li><strong>不同底色批量处理：</strong>选"自动检测"模式，工具会自动从每张图的角落采样推断底色，无需逐张手动设置</li>
          <li><strong>快速去白底：</strong>点击"去白底"预设 + "统一颜色"模式，一键批量处理</li>
          <li><strong>精确取色：</strong>点击"取色"按钮后，在预览图上点选要去除的颜色。取色会同时绑定到当前图片</li>
          <li><strong>逐张取色模式：</strong>对每张图分别取色，批量处理时各用各的颜色</li>
          <li><strong>容差调节：</strong>如果底色不均匀（如有轻微渐变），适当增大容差</li>
          <li><strong>边缘羽化：</strong>适当的羽化可以让去底边缘更自然，避免硬切割感</li>
          <li><strong>颜色色块标记：</strong>图片列表中的小圆点显示该图的底色（🎯 = 手动指定）</li>
        </ul>
      </div>

      {/* 内联动画 */}
      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}
