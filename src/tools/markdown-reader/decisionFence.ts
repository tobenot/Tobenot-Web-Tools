/**
 * ```decision 围栏 → 三列对比决策面板。
 *
 * 语法（尽量松）：
 *   第一行非空 = 标题
 *   `- 选项：说明` 或 `选项 | 说明` = 选项卡
 *   `> 注` = 底部备注
 */

let decisionFenceSeq = 0

/** 测试用：重置 id 序号 */
export function resetDecisionFenceSeq(): void {
  decisionFenceSeq = 0
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function stripMdBold(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').trim()
}

export interface ParsedDecision {
  title: string
  options: Array<{ label: string; detail: string }>
  note: string
}

export function parseDecisionFence(raw: string): ParsedDecision {
  const text = decodeBasicEntities(raw).replace(/\r\n/g, '\n')
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  let title = ''
  const options: Array<{ label: string; detail: string }> = []
  let note = ''

  for (const line of lines) {
    if (line.startsWith('>')) {
      note = line.replace(/^>\s*/, '').trim()
      continue
    }

    const labeled = line.match(/^[-*]\s+(?:\*\*)?(.+?)(?:\*\*)?\s*[：:|]\s*(.+)$/)
    if (labeled) {
      options.push({ label: stripMdBold(labeled[1]), detail: stripMdBold(labeled[2]) })
      continue
    }

    const plainBullet = line.match(/^[-*]\s+(.+)$/)
    if (plainBullet) {
      options.push({ label: stripMdBold(plainBullet[1]), detail: '' })
      continue
    }

    const pipe = line.match(/^(.+?)\s*\|\s*(.+)$/)
    if (pipe) {
      options.push({ label: stripMdBold(pipe[1]), detail: stripMdBold(pipe[2]) })
      continue
    }

    if (!title) {
      title = stripMdBold(line.replace(/^title\s*[：:]\s*/i, ''))
    }
  }

  return { title: title || '待决策', options, note }
}

export function renderDecisionFence(content: string): string {
  const parsed = parseDecisionFence(content)
  const id = `fence-decision-${decisionFenceSeq++}`

  const optionsHtml = parsed.options.length > 0
    ? parsed.options.map((opt, i) => (
        `<div class="md-decision-option">` +
        `<div class="md-decision-option-index">${i + 1}</div>` +
        `<div class="md-decision-option-label">${escapeHtml(opt.label)}</div>` +
        (opt.detail ? `<div class="md-decision-option-detail">${escapeHtml(opt.detail)}</div>` : '') +
        `</div>`
      )).join('')
    : `<div class="md-decision-option"><div class="md-decision-option-detail">（未填写选项）</div></div>`

  const noteHtml = parsed.note
    ? `<div class="md-decision-note">${escapeHtml(parsed.note)}</div>`
    : ''

  return (
    `<aside class="md-decision-panel" id="${id}" data-decision="true">` +
    `<div class="md-decision-badge">待决策</div>` +
    `<div class="md-decision-title">${escapeHtml(parsed.title)}</div>` +
    `<div class="md-decision-options">${optionsHtml}</div>` +
    noteHtml +
    `</aside>`
  )
}
