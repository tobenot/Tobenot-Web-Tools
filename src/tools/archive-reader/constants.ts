/**
 * 渲染相关常量，供 ArchiveReaderTool 与测试共用：
 * - 文档内相对链接的处理约定（锚点 / 站内 / 图片 → 按钮）
 * - 待渲染图片的类型白名单（与 jszip 可读出的二进制类型一致）
 */
export const RENDERABLE_IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'])
export const IMAGE_ICON = '🖼️'
export const FILE_ICON = '📄'
