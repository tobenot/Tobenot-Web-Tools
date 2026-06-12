import { useCallback, useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'

/* ─── 类型 ─── */
type RGB = [number, number, number]
type StrokePosition = 'outside' | 'inside' | 'center'

interface OutlineConfig {
  /** 主描边颜色 */
  color: string
  /** 主描边宽度（px） */
  width: number
  /** 主描边不透明度 0-100 */
  opacity: number
  /** 边缘羽化（px），让描边外缘更柔和、抗锯齿 */
  softness: number
  /** 描边位置：外侧 / 内侧 / 居中 */
  position: StrokePosition
  /** 透明判定阈值：alpha ≥ 该值视为「图形内部」 */
  alphaThreshold: number
  /** 第二层（外层）描边，仅外侧模式可用，常用于贴纸效果 */
  outerEnabled: boolean
  outerColor: string
  outerWidth: number
  /** 投影 */
  shadowEnabled: boolean
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  shadowOpacity: number
  /** 自动裁切透明边距 */
  autoTrim: boolean
}

interface ImageItem {
  id: string
  file: File
  originalUrl: string
  processedUrl: string | null
  width: number
  height: number
  processing: boolean
  hasTransparency: boolean
}

/* ─── 工具函数 ─── */
function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/* ─── 一维平方距离变换（Felzenszwalb & Huttenlocher, O(n)） ─── */
function edt1d(f: Float32Array, d: Float32Array, v: Int32Array, z: Float32Array, n: number) {
  let k = 0
  v[0] = 0
  z[0] = -Infinity
  z[1] = Infinity
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = Infinity
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    const dx = q - v[k]
    d[q] = dx * dx + f[v[k]]
  }
}

/** 二维欧几里得平方距离变换（就地修改 grid，返回平方距离） */
function edt2d(grid: Float32Array, W: number, H: number): Float32Array {
  const maxDim = Math.max(W, H)
  const f = new Float32Array(maxDim)
  const d = new Float32Array(maxDim)
  const v = new Int32Array(maxDim)
  const z = new Float32Array(maxDim + 1)

  // 沿行（x 方向）
  for (let y = 0; y < H; y++) {
    const off = y * W
    for (let x = 0; x < W; x++) f[x] = grid[off + x]
    edt1d(f, d, v, z, W)
    for (let x = 0; x < W; x++) grid[off + x] = d[x]
  }
  // 沿列（y 方向）
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = grid[y * W + x]
    edt1d(f, d, v, z, H)
    for (let y = 0; y < H; y++) grid[y * W + x] = d[y]
  }
  return grid
}

/* ─── 描边核心：基于有符号距离场 ─── */
function buildOutlineCanvas(img: HTMLImageElement, config: OutlineConfig): HTMLCanvasElement {
  const sw = img.naturalWidth
  const sh = img.naturalHeight

  // 1) 取源图像素
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = sw
  srcCanvas.height = sh
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.drawImage(img, 0, 0)
  const src = srcCtx.getImageData(0, 0, sw, sh).data

  const { width, outerEnabled, outerWidth, softness, position, alphaThreshold } = config
  const inner = hexToRgb(config.color)
  const outer = hexToRgb(config.outerColor)
  const useOuter = position === 'outside' && outerEnabled
  const strokeOnTop = position !== 'outside'

  // 2) 计算描边向外延伸量 → padding
  let outward = 0
  if (position === 'outside') outward = width + (useOuter ? outerWidth : 0) + softness
  else if (position === 'center') outward = width / 2 + softness
  else outward = 0
  const strokePad = Math.ceil(outward) + 2

  // 投影 padding
  const shadowRgb = hexToRgb(config.shadowColor)
  const shadowPad = config.shadowEnabled
    ? Math.ceil(config.shadowBlur * 2 + Math.max(Math.abs(config.shadowOffsetX), Math.abs(config.shadowOffsetY))) + 2
    : 0
  const pad = strokePad + shadowPad

  const W = sw + pad * 2
  const H = sh + pad * 2
  const N = W * H

  // 3) 构建距离场输入（内部=图形，外部=背景）
  const INF = 1e20
  const gOut = new Float32Array(N) // 到最近「内部」像素距离²
  const gIn = new Float32Array(N)  // 到最近「外部」像素距离²
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x
      let inside = false
      if (x >= pad && x < pad + sw && y >= pad && y < pad + sh) {
        const sp = ((y - pad) * sw + (x - pad)) * 4
        inside = src[sp + 3] >= alphaThreshold
      }
      if (inside) { gOut[p] = 0; gIn[p] = INF }
      else { gOut[p] = INF; gIn[p] = 0 }
    }
  }
  edt2d(gOut, W, H)
  edt2d(gIn, W, H)

  // 4) 合成内容
  const out = new Uint8ClampedArray(N * 4)
  const opa = config.opacity / 100
  const edge = useOuter ? width + outerWidth : width

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x
      const signed = Math.sqrt(gOut[p]) - Math.sqrt(gIn[p]) // 正=外部，负=内部

      // —— 描边层 ——
      let sr = 0, sg = 0, sb = 0, sa = 0
      if (position === 'outside') {
        if (signed <= width) { [sr, sg, sb] = inner; sa = 1 }
        else if (useOuter && signed <= width + outerWidth) { [sr, sg, sb] = outer; sa = 1 }
        else if (softness > 0 && signed <= edge + softness) {
          ;[sr, sg, sb] = useOuter ? outer : inner
          sa = 1 - (signed - edge) / softness
        }
      } else if (position === 'inside') {
        if (signed < 0 && signed >= -width) { [sr, sg, sb] = inner; sa = 1 }
        else if (softness > 0 && signed < -width && signed >= -width - softness) {
          ;[sr, sg, sb] = inner
          sa = 1 - (-width - signed) / softness
        }
      } else { // center
        const a = Math.abs(signed)
        const half = width / 2
        if (a <= half) { [sr, sg, sb] = inner; sa = 1 }
        else if (softness > 0 && a <= half + softness) {
          ;[sr, sg, sb] = inner
          sa = 1 - (a - half) / softness
        }
      }
      sa = Math.max(0, Math.min(1, sa)) * opa

      // —— 原图层 ——
      let or = 0, og = 0, ob = 0, oa = 0
      if (x >= pad && x < pad + sw && y >= pad && y < pad + sh) {
        const sp = ((y - pad) * sw + (x - pad)) * 4
        or = src[sp]; og = src[sp + 1]; ob = src[sp + 2]; oa = src[sp + 3] / 255
      }

      // —— 叠加（外侧：原图在上；内侧/居中：描边在上）——
      let tr, tg, tb, ta, br, bg, bb, ba
      if (strokeOnTop) {
        tr = sr; tg = sg; tb = sb; ta = sa
        br = or; bg = og; bb = ob; ba = oa
      } else {
        tr = or; tg = og; tb = ob; ta = oa
        br = sr; bg = sg; bb = sb; ba = sa
      }
      const outA = ta + ba * (1 - ta)
      const o4 = p * 4
      if (outA <= 0) {
        out[o4] = 0; out[o4 + 1] = 0; out[o4 + 2] = 0; out[o4 + 3] = 0
      } else {
        out[o4] = (tr * ta + br * ba * (1 - ta)) / outA
        out[o4 + 1] = (tg * ta + bg * ba * (1 - ta)) / outA
        out[o4 + 2] = (tb * ta + bb * ba * (1 - ta)) / outA
        out[o4 + 3] = outA * 255
      }
    }
  }

  const contentCanvas = document.createElement('canvas')
  contentCanvas.width = W
  contentCanvas.height = H
  const cctx = contentCanvas.getContext('2d')!
  cctx.putImageData(new ImageData(out, W, H), 0, 0)

  // 5) 投影
  let finalCanvas = contentCanvas
  if (config.shadowEnabled) {
    finalCanvas = document.createElement('canvas')
    finalCanvas.width = W
    finalCanvas.height = H
    const fctx = finalCanvas.getContext('2d')!
    fctx.shadowColor = `rgba(${shadowRgb[0]},${shadowRgb[1]},${shadowRgb[2]},${config.shadowOpacity / 100})`
    fctx.shadowBlur = config.shadowBlur
    fctx.shadowOffsetX = config.shadowOffsetX
    fctx.shadowOffsetY = config.shadowOffsetY
    fctx.drawImage(contentCanvas, 0, 0)
  }

  // 6) 自动裁切透明边距
  if (config.autoTrim) {
    const fctx = finalCanvas.getContext('2d')!
    const data = fctx.getImageData(0, 0, W, H).data
    let minX = W, minY = H, maxX = -1, maxY = -1
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 0) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX >= minX && maxY >= minY) {
      const cw = maxX - minX + 1
      const ch = maxY - minY + 1
      const trimmed = document.createElement('canvas')
      trimmed.width = cw
      trimmed.height = ch
      trimmed.getContext('2d')!.drawImage(finalCanvas, minX, minY, cw, ch, 0, 0, cw, ch)
      finalCanvas = trimmed
    }
  }

  return finalCanvas
}

/** 处理单张图片，返回 PNG dataURL */
function processImage(imageUrl: string, config: OutlineConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = buildOutlineCanvas(img, config)
        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = reject
    img.src = imageUrl
  })
}

/** 检测图片是否含透明像素 */
function detectTransparency(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, c.width, c.height).data
      let hasAlpha = false
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) { hasAlpha = true; break }
      }
      resolve(hasAlpha)
    }
    img.onerror = () => resolve(false)
    img.src = imageUrl
  })
}

/* ─── 预设 ─── */
type Preset = { label: string; emoji: string; patch: Partial<OutlineConfig> }
const PRESETS: Preset[] = [
  { label: '白色贴纸', emoji: '⬜', patch: { color: '#ffffff', width: 14, position: 'outside', softness: 1.2, opacity: 100, outerEnabled: false, shadowEnabled: true, shadowColor: '#000000', shadowBlur: 10, shadowOffsetX: 0, shadowOffsetY: 6, shadowOpacity: 30 } },
  { label: '黑色描边', emoji: '⬛', patch: { color: '#000000', width: 6, position: 'outside', softness: 1, opacity: 100, outerEnabled: false, shadowEnabled: false } },
  { label: '漫画双描边', emoji: '🗯️', patch: { color: '#ffffff', width: 10, position: 'outside', softness: 1, opacity: 100, outerEnabled: true, outerColor: '#000000', outerWidth: 5, shadowEnabled: false } },
  { label: '霓虹发光', emoji: '💡', patch: { color: '#22d3ee', width: 4, position: 'outside', softness: 2, opacity: 100, outerEnabled: false, shadowEnabled: true, shadowColor: '#22d3ee', shadowBlur: 22, shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 90 } },
  { label: '内描边', emoji: '🔲', patch: { color: '#ffffff', width: 6, position: 'inside', softness: 1, opacity: 90, outerEnabled: false, shadowEnabled: false } },
]

/* ─── 组件 ─── */
export function ImageOutlineTool() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [keepOriginalName, setKeepOriginalName] = useState(false)
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [previewProcessing, setPreviewProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [config, setConfig] = useState<OutlineConfig>({
    color: '#ffffff',
    width: 12,
    opacity: 100,
    softness: 1.2,
    position: 'outside',
    alphaThreshold: 64,
    outerEnabled: false,
    outerColor: '#000000',
    outerWidth: 4,
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 8,
    shadowOffsetX: 0,
    shadowOffsetY: 4,
    shadowOpacity: 35,
    autoTrim: true,
  })

  const selectedImage = images.find(img => img.id === selectedImageId)

  /* 文件处理 */
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
          width: img.naturalWidth,
          height: img.naturalHeight,
          processing: false,
          hasTransparency: false,
        }
        setImages(prev => [...prev, item])
        setSelectedImageId(prev => prev ?? item.id)
        detectTransparency(url).then(has => {
          setImages(prev => prev.map(i => i.id === item.id ? { ...i, hasTransparency: has } : i))
        })
      }
      img.src = url
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
  }, [])

  /* 实时预览：选中图 / 配置变动时（防抖）重处理 */
  useEffect(() => {
    if (!selectedImage) return
    let cancelled = false
    const timer = setTimeout(() => {
      setPreviewProcessing(true)
      processImage(selectedImage.originalUrl, config)
        .then(result => {
          if (!cancelled) {
            setImages(prev => prev.map(i => i.id === selectedImage.id ? { ...i, processedUrl: result } : i))
          }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setPreviewProcessing(false) })
    }, 220)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImage?.id, config])

  /* 批量处理 */
  const processAll = useCallback(async () => {
    setBatchProcessing(true)
    for (const image of images) {
      setImages(prev => prev.map(i => i.id === image.id ? { ...i, processing: true } : i))
      try {
        const result = await processImage(image.originalUrl, config)
        setImages(prev => prev.map(i => i.id === image.id ? { ...i, processedUrl: result, processing: false } : i))
      } catch {
        setImages(prev => prev.map(i => i.id === image.id ? { ...i, processing: false } : i))
      }
    }
    setBatchProcessing(false)
  }, [config, images])

  const outName = useCallback((file: File) => {
    return keepOriginalName
      ? file.name.replace(/\.[^.]+$/, '.png')
      : `描边_${file.name.replace(/\.[^.]+$/, '')}.png`
  }, [keepOriginalName])

  /* 下载 */
  const downloadSingle = useCallback((image: ImageItem) => {
    if (!image.processedUrl) return
    const link = document.createElement('a')
    link.download = outName(image.file)
    link.href = image.processedUrl
    link.click()
  }, [outName])

  const downloadAll = useCallback(async () => {
    const processed = images.filter(i => i.processedUrl)
    if (processed.length === 0) return
    setZipping(true)
    try {
      const zip = new JSZip()
      for (const image of processed) {
        const res = await fetch(image.processedUrl!)
        const blob = await res.blob()
        zip.file(outName(image.file), blob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `描边结果_${processed.length}张.zip`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setZipping(false)
    }
  }, [images, outName])

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const updated = prev.filter(i => i.id !== id)
      if (selectedImageId === id) setSelectedImageId(updated[0]?.id ?? null)
      return updated
    })
  }, [selectedImageId])

  const clearAll = useCallback(() => {
    images.forEach(i => URL.revokeObjectURL(i.originalUrl))
    setImages([])
    setSelectedImageId(null)
  }, [images])

  const patchConfig = (patch: Partial<OutlineConfig>) => setConfig(prev => ({ ...prev, ...patch }))

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
            <div className="text-2xl">🖊️</div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-gray-900">图片描边工具</h2>
              <p className="text-sm text-gray-600 mt-1">
                为透明底图片（PNG）沿图形轮廓添加平滑描边，支持双层描边、投影、内/外/居中模式与批量处理
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左栏：上传 + 列表 */}
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-lg p-8 text-center cursor-pointer transition-colors"
          >
            <div className="text-4xl mb-2">📁</div>
            <p className="text-sm font-medium text-gray-700">点击或拖放图片到此处</p>
            <p className="text-xs text-gray-500 mt-1">推荐使用透明底 PNG / WebP，可批量添加</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {images.length > 0 && (
            <div className="border-2 border-gray-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">已添加 {images.length} 张图片</span>
                <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 font-medium">清空全部</button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
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
                    <div
                      className="w-10 h-10 rounded border border-gray-200 shrink-0"
                      style={{ backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%)', backgroundSize: '8px 8px' }}
                    >
                      <img src={img.originalUrl} alt="" className="w-10 h-10 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{img.file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{img.width}×{img.height}</span>
                        {!img.hasTransparency && (
                          <span className="text-xs text-amber-600" title="该图片不含透明像素，外侧描边可能不可见">⚠ 无透明</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {img.processing && <span className="text-xs text-blue-500 animate-pulse">处理中</span>}
                      {img.processedUrl && !img.processing && <span className="text-xs text-green-600">✓</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                        className="text-gray-400 hover:text-red-500 text-sm"
                        title="移除"
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 快捷预设 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">⚡ 快捷预设</h3>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => patchConfig(p.patch)}
                  className="px-3 py-2 text-xs font-medium border-2 border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 中栏：预览 */}
        <div className="space-y-4">
          {selectedImage ? (
            <div className="border-2 border-gray-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">实时预览</span>
                {previewProcessing && <span className="text-xs text-blue-500 animate-pulse">渲染中…</span>}
              </div>
              <div
                className="overflow-auto flex items-center justify-center"
                style={{
                  minHeight: '320px',
                  maxHeight: '460px',
                  backgroundImage: 'repeating-conic-gradient(#d1d5db 0% 25%, #f9fafb 0% 50%)',
                  backgroundSize: '20px 20px',
                }}
              >
                <img
                  src={selectedImage.processedUrl ?? selectedImage.originalUrl}
                  alt="预览"
                  className="max-w-full h-auto block"
                  style={{ padding: '16px' }}
                />
              </div>
              {selectedImage.processedUrl && (
                <div className="px-4 py-2 bg-green-50 border-t border-gray-100">
                  <span className="text-xs font-medium text-green-700">✓ 已生成描边（透明背景）</span>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-lg flex items-center justify-center h-80">
              <p className="text-sm text-gray-500">请先添加图片</p>
            </div>
          )}

          {selectedImage && !selectedImage.hasTransparency && config.position === 'outside' && (
            <div className="border-2 border-amber-200 bg-amber-50 p-3 rounded text-xs text-amber-700">
              当前图片没有透明区域，外侧描边沿图形轮廓延伸需要透明底。可改用「内侧」模式，或先用「图片去底工具」抠图。
            </div>
          )}
        </div>

        {/* 右栏：参数 */}
        <div className="space-y-4">
          {/* 描边位置 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">📐 描边位置</h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['outside', '外侧'],
                ['center', '居中'],
                ['inside', '内侧'],
              ] as [StrokePosition, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => patchConfig({ position: val })}
                  className={`px-2 py-2 text-xs font-medium border-2 transition-colors ${
                    config.position === val
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* 主描边 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">🎨 主描边</h3>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.color}
                onChange={(e) => patchConfig({ color: e.target.value })}
                className="w-10 h-10 border-2 border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={config.color}
                onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) patchConfig({ color: e.target.value }) }}
                className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 font-mono focus:border-blue-400 focus:outline-none"
                placeholder="#ffffff"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">宽度</span>
                <span className="text-xs font-mono text-blue-600">{config.width}px</span>
              </div>
              <input type="range" min={0} max={60} value={config.width}
                onChange={(e) => patchConfig({ width: Number(e.target.value) })}
                className="w-full accent-blue-500" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">不透明度</span>
                <span className="text-xs font-mono text-blue-600">{config.opacity}%</span>
              </div>
              <input type="range" min={0} max={100} value={config.opacity}
                onChange={(e) => patchConfig({ opacity: Number(e.target.value) })}
                className="w-full accent-blue-500" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">边缘羽化</span>
                <span className="text-xs font-mono text-blue-600">{config.softness}</span>
              </div>
              <input type="range" min={0} max={10} step={0.2} value={config.softness}
                onChange={(e) => patchConfig({ softness: Number(e.target.value) })}
                className="w-full accent-blue-500" />
              <p className="text-xs text-gray-400">越大边缘越柔和（抗锯齿）；0 为硬边。</p>
            </div>
          </div>

          {/* 第二层描边 */}
          <div className={`border-2 border-gray-200 bg-white p-4 space-y-3 ${config.position !== 'outside' ? 'opacity-60' : ''}`}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.outerEnabled}
                disabled={config.position !== 'outside'}
                onChange={(e) => patchConfig({ outerEnabled: e.target.checked })}
                className="accent-blue-500"
              />
              <h3 className="text-sm font-semibold text-gray-700">🥪 第二层描边（贴纸效果）</h3>
            </label>
            {config.position !== 'outside' && (
              <p className="text-xs text-gray-400">仅「外侧」模式可用</p>
            )}
            {config.outerEnabled && config.position === 'outside' && (
              <>
                <div className="flex items-center gap-3">
                  <input type="color" value={config.outerColor}
                    onChange={(e) => patchConfig({ outerColor: e.target.value })}
                    className="w-10 h-10 border-2 border-gray-300 rounded cursor-pointer" />
                  <input type="text" value={config.outerColor}
                    onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) patchConfig({ outerColor: e.target.value }) }}
                    className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 font-mono focus:border-blue-400 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">外层宽度</span>
                    <span className="text-xs font-mono text-blue-600">{config.outerWidth}px</span>
                  </div>
                  <input type="range" min={0} max={40} value={config.outerWidth}
                    onChange={(e) => patchConfig({ outerWidth: Number(e.target.value) })}
                    className="w-full accent-blue-500" />
                </div>
              </>
            )}
          </div>

          {/* 投影 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.shadowEnabled}
                onChange={(e) => patchConfig({ shadowEnabled: e.target.checked })}
                className="accent-blue-500"
              />
              <h3 className="text-sm font-semibold text-gray-700">🌑 投影 / 发光</h3>
            </label>
            {config.shadowEnabled && (
              <>
                <div className="flex items-center gap-3">
                  <input type="color" value={config.shadowColor}
                    onChange={(e) => patchConfig({ shadowColor: e.target.value })}
                    className="w-10 h-10 border-2 border-gray-300 rounded cursor-pointer" />
                  <input type="text" value={config.shadowColor}
                    onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) patchConfig({ shadowColor: e.target.value }) }}
                    className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 font-mono focus:border-blue-400 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">模糊</span>
                    <span className="text-xs font-mono text-blue-600">{config.shadowBlur}px</span>
                  </div>
                  <input type="range" min={0} max={40} value={config.shadowBlur}
                    onChange={(e) => patchConfig({ shadowBlur: Number(e.target.value) })}
                    className="w-full accent-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-600">X 偏移 {config.shadowOffsetX}</span>
                    <input type="range" min={-30} max={30} value={config.shadowOffsetX}
                      onChange={(e) => patchConfig({ shadowOffsetX: Number(e.target.value) })}
                      className="w-full accent-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-600">Y 偏移 {config.shadowOffsetY}</span>
                    <input type="range" min={-30} max={30} value={config.shadowOffsetY}
                      onChange={(e) => patchConfig({ shadowOffsetY: Number(e.target.value) })}
                      className="w-full accent-blue-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">不透明度</span>
                    <span className="text-xs font-mono text-blue-600">{config.shadowOpacity}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={config.shadowOpacity}
                    onChange={(e) => patchConfig({ shadowOpacity: Number(e.target.value) })}
                    className="w-full accent-blue-500" />
                </div>
                <p className="text-xs text-gray-400">偏移设为 0、颜色与描边一致、模糊调大即为「发光」效果。</p>
              </>
            )}
          </div>

          {/* 高级 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">⚙️ 高级</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">透明判定阈值</span>
                <span className="text-xs font-mono text-blue-600">{config.alphaThreshold}</span>
              </div>
              <input type="range" min={1} max={254} value={config.alphaThreshold}
                onChange={(e) => patchConfig({ alphaThreshold: Number(e.target.value) })}
                className="w-full accent-blue-500" />
              <p className="text-xs text-gray-400">alpha ≥ 该值的像素视为图形内部。半透明边缘毛糙时可调高。</p>
            </div>
            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={config.autoTrim}
                onChange={(e) => patchConfig({ autoTrim: e.target.checked })}
                className="mt-0.5 accent-blue-500" />
              <div>
                <span className="text-sm font-medium text-gray-800">自动裁切透明边距</span>
                <p className="text-xs text-gray-500">导出时去除四周多余的透明像素，紧贴内容。</p>
              </div>
            </label>
          </div>

          {/* 操作 */}
          <div className="border-2 border-gray-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">🚀 操作</h3>
            <label className="flex items-start gap-2 cursor-pointer pb-2 border-b border-gray-100">
              <input type="checkbox" checked={keepOriginalName}
                onChange={(e) => setKeepOriginalName(e.target.checked)}
                className="mt-0.5 accent-blue-500" />
              <div>
                <span className="text-sm font-medium text-gray-800">保持原文件名</span>
                <p className="text-xs text-gray-500">不添加「描边_」前缀（统一输出为 .png）。</p>
              </div>
            </label>

            <div className="space-y-2 pt-1">
              <button
                onClick={processAll}
                disabled={batchProcessing || images.length === 0}
                className="w-full px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {batchProcessing ? '批量处理中…' : `用当前参数批量处理 (${images.length}张)`}
              </button>
              {selectedImage?.processedUrl && (
                <button
                  onClick={() => downloadSingle(selectedImage)}
                  className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  下载当前结果
                </button>
              )}
              {images.some(i => i.processedUrl) && (
                <button
                  onClick={downloadAll}
                  disabled={zipping}
                  className="w-full px-4 py-2.5 text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {zipping ? '打包中…' : `下载全部结果 ZIP (${images.filter(i => i.processedUrl).length}张)`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 使用技巧 */}
      <div className="border-2 border-gray-200 bg-white p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">💡 使用技巧</h3>
        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
          <li><strong>需要透明底：</strong>外侧描边沿图形轮廓向外扩展，所以输入应为透明背景 PNG。若是白底图，先用「图片去底工具」抠图。</li>
          <li><strong>贴纸效果：</strong>用「漫画双描边」预设（白色内描边 + 黑色外描边），或自行开启「第二层描边」。</li>
          <li><strong>发光效果：</strong>开启投影，偏移设 0、颜色设为亮色、模糊调大、不透明度调高。</li>
          <li><strong>描边算法：</strong>基于欧几里得有符号距离场（SDF），描边粗细均匀、转角圆润，配合羽化可得到平滑抗锯齿边缘。</li>
          <li><strong>实时预览：</strong>调整任意参数都会自动重渲染当前选中图；满意后点「批量处理」套用到全部。</li>
          <li><strong>内/居中描边：</strong>不要求透明底，描边会绘制在图形边缘内侧或正中。</li>
        </ul>
      </div>

      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}
