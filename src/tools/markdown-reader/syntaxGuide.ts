/**
 * 增强语法一览 —— 界面「语法说明」的唯一数据源。
 * 新增 fence / Callout 类型时只改这里。
 */

export interface SyntaxGuideItem {
  id: string
  title: string
  /** 简短状态，如「已支持」 */
  status: string
  blurb: string
  example: string
}

export const SYNTAX_GUIDE_INTRO =
  '本阅读器在标准 Markdown / GFM 之上做了渐进增强。下面写法会渲染成 Callout、决策面板、图表等；写错或不支持时会退回普通文本/代码块。'

export const SYNTAX_GUIDE_ITEMS: SyntaxGuideItem[] = [
  {
    id: 'callout',
    title: 'Callout 提示块',
    status: '已支持',
    blurb: '在引用第一行写 [!类型]。英文：NOTE / TIP / IMPORTANT / WARNING / CAUTION；中文：决策 / 洞察 / 坑。',
    example: `> [!洞察]
> 稳定身份不仅是正确性要求，更解锁了逐弹成长。

> [!NOTE]
> 所有 API 需要认证令牌。

> [!WARNING]
> 分享链接内容不可信，阅读器会做 HTML 净化。

> [!决策]
> 这里放需要拍板的事项说明。`,
  },
  {
    id: 'label-badge',
    title: '段首标签徽章',
    status: '已支持',
    blurb: '段落开头写成 **标签名**： （中英冒号均可）。「待决策 / 决策点 / 未决」会进入侧栏决策聚合。',
    example: `**待决策**：生命加成归属玩家、本剑，还是整簇共享。

**注意**：部署前先跑一遍回归。`,
  },
  {
    id: 'decision-fence',
    title: '决策对比面板',
    status: '已支持',
    blurb: '围栏语言 decision。第一行标题；`- 选项：说明` 或 `选项 | 说明`；`> 备注` 作脚注。',
    example: `\`\`\`decision
+1 生命的归属
- 玩家：吸血流，全局收益
- 本剑：越战越肉，单剑成长
- 整簇：共享成长池
> 三者架构都支持，玩法体验完全不同
\`\`\``,
  },
  {
    id: 'code-chrome',
    title: '代码块增强',
    status: '已支持',
    blurb: '任意 language-xxx 代码块自动带语言标签与复制按钮；C 系 / JS / Python 等会淡化行注释。',
    example: `\`\`\`cpp
struct FPlayerProjectileState
{
    FProjectileHandle Handle;   // 稳定身份 —— 一切前提
    float BonusCritRate;        // 本剑累积暴击
};
\`\`\``,
  },
  {
    id: 'mermaid',
    title: 'Mermaid 流程图',
    status: '已支持',
    blurb: '围栏语言 mermaid，本地渲染。',
    example: `\`\`\`mermaid
flowchart TD
  A[命中] --> B[结算伤害]
  B --> C[本剑成长 +1]
\`\`\``,
  },
  {
    id: 'plantuml',
    title: 'PlantUML',
    status: '已支持',
    blurb: '围栏 plantuml / puml，经 Kroki 渲染。',
    example: `\`\`\`plantuml
@startuml
Alice -> Bob: hello
@enduml
\`\`\``,
  },
  {
    id: 'graphviz',
    title: 'Graphviz / DOT',
    status: '已支持',
    blurb: '围栏 graphviz / dot，经 Kroki 渲染。',
    example: `\`\`\`dot
digraph G {
  Hit -> Crit;
  Crit -> Grow;
}
\`\`\``,
  },
  {
    id: 'footnote',
    title: '脚注',
    status: '已支持',
    blurb: '引用写成 [^id^]（或标准 [^id]），定义段以 [^id^] 开头（或标准 [^id]:）。定义就地显示在原位，点击上下互跳。',
    example: `正文引用来源[^1^]，也引用[^2^]。

[^1^] 第一条脚注，就显示在此处。
[^2^] 第二条脚注。

也支持标准写法[^3]：

[^3]: 标准定义用冒号，同样就地显示。`,
  },
]

/** 整份可复制的 Markdown 速查 */
export function buildSyntaxGuideMarkdown(): string {
  const parts = [
    '# Mecha Markdown 增强语法速查',
    '',
    SYNTAX_GUIDE_INTRO,
    '',
  ]
  for (const item of SYNTAX_GUIDE_ITEMS) {
    parts.push(`## ${item.title}（${item.status}）`)
    parts.push('')
    parts.push(item.blurb)
    parts.push('')
    parts.push(item.example)
    parts.push('')
  }
  return parts.join('\n')
}
