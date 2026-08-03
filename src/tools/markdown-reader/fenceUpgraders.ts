import { renderDecisionFence } from './decisionFence'

/**
 * Fence 语言 → HTML 升级器。匹配失败退回原 `<pre><code>`。
 * 新能力往表里塞一项即可，不必改阅读器主干分支。
 */

export type FenceUpgrader = (content: string, language: string) => string | null

const KROKI_LABEL: Record<string, string> = {
  plantuml: 'PlantUML',
  graphviz: 'Graphviz',
}

function krokiBlock(type: 'plantuml' | 'graphviz', content: string): string {
  const label = KROKI_LABEL[type]
  return (
    `<div class="kroki-diagram" data-diagram-type="${type}">` +
    `<pre class="kroki-source">${content}</pre>` +
    `<div class="kroki-output">${label} 图表渲染中...</div>` +
    `</div>`
  )
}

/** 语言别名归一到主 key */
const LANGUAGE_ALIASES: Record<string, string> = {
  puml: 'plantuml',
  dot: 'graphviz',
}

export const FENCE_UPGRADERS: Record<string, FenceUpgrader> = {
  mermaid: (content) => `<div class="mermaid">${content}</div>`,
  plantuml: (content) => krokiBlock('plantuml', content),
  graphviz: (content) => krokiBlock('graphviz', content),
  decision: (content) => renderDecisionFence(content),
}

export function resolveFenceLanguage(raw: string): string {
  const lang = raw.toLowerCase()
  return LANGUAGE_ALIASES[lang] ?? lang
}

/**
 * 把 marked 产出的 fence 交给注册表升级。
 * 未注册语言原样返回（留给后续 code chrome）。
 */
export function upgradeFenceBlocks(html: string): string {
  return html.replace(
    /<pre><code class="[^"]*\blanguage-([a-z0-9_+-]+)\b[^"]*">([\s\S]*?)<\/code><\/pre>/gi,
    (match, rawLanguage: string, content: string) => {
      const language = resolveFenceLanguage(rawLanguage)
      const upgrader = FENCE_UPGRADERS[language]
      if (!upgrader) return match
      return upgrader(content, language) ?? match
    },
  )
}
