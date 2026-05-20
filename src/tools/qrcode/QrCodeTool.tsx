import { useCallback, useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToast } from '../../components/Toast'

// Minimal QR Code generator using Canvas + qr-code encoding via the QR algorithm
// We use a well-known technique: generate QR via an offscreen canvas with the help of a minimal encoder

export function QrCodeTool() {
  const [text, setText] = useState('')
  const [size, setSize] = useState(256)
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  const generateQR = useCallback(() => {
    if (!text || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    canvas.width = size
    canvas.height = size

    // Use the minimal QR generation
    const modules = encodeQR(text)
    if (!modules) {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, size, size)
      ctx.fillStyle = '#ef4444'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('文本过长，无法生成', size / 2, size / 2)
      return
    }

    const moduleCount = modules.length
    const cellSize = size / moduleCount

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = fgColor
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules[row][col]) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize + 0.5, cellSize + 0.5)
        }
      }
    }
  }, [text, size, fgColor, bgColor])

  useEffect(() => {
    generateQR()
  }, [generateQR])

  function handleDownload() {
    if (!canvasRef.current || !text) return
    const link = document.createElement('a')
    link.download = 'qrcode.png'
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
    toast('已下载 QR 码')
  }

  function handleCopyImage() {
    if (!canvasRef.current || !text) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      toast('已复制到剪贴板')
    })
  }

  return (
    <ToolLayout
      title="二维码生成"
      description="输入文本或 URL，即时生成二维码，可下载 PNG"
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">内容</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="输入文本或 URL..."
            className="w-full h-24 p-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-y focus:border-blue-500 focus:outline-none"
            style={{ borderRadius: '2px' }}
          />
        </div>

        {/* Options */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">尺寸</label>
            <select
              value={size}
              onChange={e => setSize(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              style={{ borderRadius: '2px' }}
            >
              <option value={128}>128px</option>
              <option value={256}>256px</option>
              <option value={512}>512px</option>
              <option value={1024}>1024px</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">前景</label>
            <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} className="w-7 h-7 border border-gray-300 cursor-pointer" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">背景</label>
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-7 h-7 border border-gray-300 cursor-pointer" />
          </div>
        </div>

        {/* QR Preview */}
        <div className="flex flex-col items-center gap-4 py-4">
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="border-2 border-gray-200 dark:border-gray-700"
            style={{ width: Math.min(size, 300), height: Math.min(size, 300), imageRendering: 'pixelated', borderRadius: '2px' }}
          />
          {!text && (
            <p className="text-sm text-gray-400 dark:text-gray-500">输入内容后生成二维码</p>
          )}
        </div>

        {/* Actions */}
        {text && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 border-2 border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-sm hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
              style={{ borderRadius: '2px' }}
            >
              下载 PNG
            </button>
            <button
              onClick={handleCopyImage}
              className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              style={{ borderRadius: '2px' }}
            >
              复制图片
            </button>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}

// ============================================
// Minimal QR Code Encoder (Version 1-6, Byte mode, Error correction L)
// Based on simplified Reed-Solomon + QR spec
// ============================================

function encodeQR(text: string): boolean[][] | null {
  const data = new TextEncoder().encode(text)
  if (data.length > 134) return null // max for version 6-L

  // Determine version
  const capacities = [17, 32, 53, 78, 106, 134]
  let version = 0
  for (let v = 0; v < capacities.length; v++) {
    if (data.length <= capacities[v]) { version = v + 1; break }
  }
  if (version === 0) return null

  const moduleCount = 17 + version * 4
  const modules: boolean[][] = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(false))
  const reserved: boolean[][] = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(false))

  // Place finder patterns
  placeFinderPattern(modules, reserved, 0, 0)
  placeFinderPattern(modules, reserved, moduleCount - 7, 0)
  placeFinderPattern(modules, reserved, 0, moduleCount - 7)

  // Place timing patterns
  for (let i = 8; i < moduleCount - 8; i++) {
    modules[6][i] = i % 2 === 0
    modules[i][6] = i % 2 === 0
    reserved[6][i] = true
    reserved[i][6] = true
  }

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    reserved[8][i] = true
    reserved[8][moduleCount - 1 - i] = true
    reserved[i][8] = true
    reserved[moduleCount - 1 - i][8] = true
  }
  reserved[8][8] = true

  // Alignment patterns for version >= 2
  if (version >= 2) {
    const positions = getAlignmentPositions(version)
    for (const row of positions) {
      for (const col of positions) {
        if (reserved[row][col]) continue
        placeAlignmentPattern(modules, reserved, row, col)
      }
    }
  }

  // Encode data
  const totalCodewords = getTotalCodewords(version)
  const ecCodewords = getECCodewords(version)
  const dataCodewords = totalCodewords - ecCodewords

  // Build data bits: mode(4) + count(8 or 16) + data + terminator + padding
  let bits = ''
  bits += '0100' // byte mode
  bits += (version < 10 ? toBin(data.length, 8) : toBin(data.length, 16))
  for (const b of data) bits += toBin(b, 8)
  bits += '0000' // terminator (up to 4 bits)

  while (bits.length % 8 !== 0) bits += '0'
  while (bits.length < dataCodewords * 8) {
    bits += '11101100'
    if (bits.length < dataCodewords * 8) bits += '00010001'
  }

  const codewords: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(parseInt(bits.slice(i, i + 8), 2))
  }

  // Reed-Solomon error correction
  const ecBytes = generateEC(codewords.slice(0, dataCodewords), ecCodewords)
  const finalData = [...codewords.slice(0, dataCodewords), ...ecBytes]

  // Place data
  let bitIdx = 0
  const dataBits = finalData.map(b => toBin(b, 8)).join('')

  let direction = -1
  let x = moduleCount - 1
  while (x >= 0) {
    if (x === 6) x-- // skip timing column
    for (let i = 0; i < moduleCount; i++) {
      const y = direction === -1 ? moduleCount - 1 - i : i
      for (let dx = 0; dx <= 1; dx++) {
        const col = x - dx
        if (col < 0) continue
        if (reserved[y][col]) continue
        if (bitIdx < dataBits.length) {
          modules[y][col] = dataBits[bitIdx] === '1'
        }
        bitIdx++
      }
    }
    direction *= -1
    x -= 2
  }

  // Apply mask (pattern 0: (row + col) % 2 === 0)
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!reserved[row][col] && (row + col) % 2 === 0) {
        modules[row][col] = !modules[row][col]
      }
    }
  }

  // Place format info (L error correction, mask 0)
  const formatInfo = getFormatBits(0, 0) // ecLevel L=1 -> 01, mask 0
  placeFormatInfo(modules, reserved, moduleCount, formatInfo)

  // Dark module
  modules[moduleCount - 8][8] = true

  return modules
}

function placeFinderPattern(modules: boolean[][], reserved: boolean[][], startRow: number, startCol: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isEdge = r === 0 || r === 6 || c === 0 || c === 6
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
      modules[startRow + r][startCol + c] = isEdge || isInner
      reserved[startRow + r][startCol + c] = true
    }
  }
  // Separator
  for (let i = 0; i < 8; i++) {
    const positions = [
      [startRow + 7, startCol + i], [startRow + i, startCol + 7],
      [startRow - 1, startCol + i], [startRow + i, startCol - 1],
      [startRow + 7, startCol + i], [startRow + i, startCol + 7]
    ]
    for (const [r, c] of positions) {
      if (r >= 0 && r < modules.length && c >= 0 && c < modules.length) {
        reserved[r][c] = true
      }
    }
  }
  // Full separator rows/cols
  for (let i = -1; i <= 7; i++) {
    for (const [r, c] of [[startRow + i, startCol + 7], [startRow + i, startCol - 1], [startRow + 7, startCol + i], [startRow - 1, startCol + i]]) {
      if (r >= 0 && r < modules.length && c >= 0 && c < modules.length) {
        reserved[r][c] = true
      }
    }
  }
}

function placeAlignmentPattern(modules: boolean[][], reserved: boolean[][], centerRow: number, centerCol: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2
      const isCenter = r === 0 && c === 0
      modules[centerRow + r][centerCol + c] = isEdge || isCenter
      reserved[centerRow + r][centerCol + c] = true
    }
  }
}

function getAlignmentPositions(version: number): number[] {
  if (version === 1) return []
  const positions: number[][] = [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]
  ]
  return positions[version - 1] || []
}

function getTotalCodewords(version: number): number {
  const totals = [26, 44, 70, 100, 134, 172]
  return totals[version - 1] || 26
}

function getECCodewords(version: number): number {
  const ec = [7, 10, 15, 20, 26, 36]
  return ec[version - 1] || 7
}

function toBin(n: number, len: number): string {
  return n.toString(2).padStart(len, '0')
}

function generateEC(data: number[], ecCount: number): number[] {
  const gp = getGeneratorPolynomial(ecCount)
  const msg = [...data, ...Array(ecCount).fill(0)]

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]
    if (coef === 0) continue
    const logCoef = LOG_TABLE[coef]
    for (let j = 0; j < gp.length; j++) {
      msg[i + j] ^= EXP_TABLE[(logCoef + gp[j]) % 255]
    }
  }

  return msg.slice(data.length)
}

function getGeneratorPolynomial(degree: number): number[] {
  let poly = [0]
  for (let i = 0; i < degree; i++) {
    const newPoly = Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      newPoly[j] = (newPoly[j] !== undefined ? newPoly[j] : 0)
      // multiply by (x - a^i)
      const a = poly[j]
      const b = (a + i) % 255
      newPoly[j + 1] ^= EXP_TABLE[b]
      newPoly[j] = EXP_TABLE[a]
    }
    // Actually we need to work in log form
    poly = newPoly.map(v => LOG_TABLE[v] !== undefined ? LOG_TABLE[v] : 0)
  }
  // Recalculate properly
  let gen = [0]
  for (let i = 0; i < degree; i++) {
    const newGen: number[] = Array(gen.length + 1).fill(0)
    for (let j = 0; j < gen.length; j++) {
      newGen[j] ^= EXP_TABLE[(gen[j] + 0) % 255]
      newGen[j + 1] ^= EXP_TABLE[(gen[j] + i) % 255]
    }
    gen = newGen.map(v => LOG_TABLE[v])
  }
  return gen
}

// GF(256) tables
const EXP_TABLE: number[] = Array(256)
const LOG_TABLE: number[] = Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x
    LOG_TABLE[x] = i
    x <<= 1
    if (x >= 256) x ^= 0x11d
  }
  EXP_TABLE[255] = EXP_TABLE[0]
})()

function getFormatBits(ecLevel: number, mask: number): string {
  // Pre-calculated format strings for EC level L (01) with each mask
  const formats = [
    '111011111000100', // L, mask 0
    '111001011110011', // L, mask 1
    '111110110101010', // L, mask 2
    '111100010011101', // L, mask 3
    '110011000101111', // L, mask 4
    '110001100011000', // L, mask 5
    '110110001000001', // L, mask 6
    '110100101110110', // L, mask 7
  ]
  return formats[mask] || formats[0]
}

function placeFormatInfo(modules: boolean[][], _reserved: boolean[][], moduleCount: number, bits: string) {
  // Place format bits around finder patterns
  const positions1 = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8],
    [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0]
  ]
  const positions2 = [
    [8, moduleCount - 1], [8, moduleCount - 2], [8, moduleCount - 3], [8, moduleCount - 4],
    [8, moduleCount - 5], [8, moduleCount - 6], [8, moduleCount - 7],
    [moduleCount - 7, 8], [moduleCount - 6, 8], [moduleCount - 5, 8], [moduleCount - 4, 8],
    [moduleCount - 3, 8], [moduleCount - 2, 8], [moduleCount - 1, 8], [moduleCount - 8, 8]
  ]

  for (let i = 0; i < 15; i++) {
    const bit = bits[i] === '1'
    if (positions1[i]) {
      const [r, c] = positions1[i]
      modules[r][c] = bit
    }
    if (positions2[i]) {
      const [r, c] = positions2[i]
      modules[r][c] = bit
    }
  }
}
