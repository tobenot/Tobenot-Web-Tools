# Mecha Tools — 需求补充与演进规划

> 最后更新: 2026-05-20  
> 状态: 大部分已完成

---

## 一、基建增强

### 1.1 暗色模式 (Dark Mode)

**动机**: 工具站用户偏开发者，暗色是刚需。且 seamless-texture 等独立 app 已经在用深色背景，和主站白底割裂。

**方案**:
- Tailwind `darkMode: 'class'` 策略
- 在 `<html>` 上切换 `.dark` class
- 持久化到 localStorage
- Header 添加主题切换按钮
- 需为所有 React 工具和组件补充 `dark:` 类
- 独立 HTML apps 各自决定是否跟随（后续逐步适配）

**验收感觉**: 点一下切换，全站柔和暗色，不刺眼。

---

### 1.2 PWA 支持

**动机**: 工具类站点天然适合离线使用、桌面快捷方式。

**方案**:
- 添加 `public/manifest.json`（name/icons/theme_color/start_url）
- 添加简单 Service Worker（缓存静态资源）
- 可用 `vite-plugin-pwa` 一键搞定
- 支持 "添加到主屏幕"

**验收感觉**: 手机/桌面能安装为 app 图标，断网后已访问的工具仍可用。

---

### 1.3 React Error Boundary

**动机**: 任何一个工具组件崩溃不应白屏整站。

**方案**:
- 新建 `src/components/ErrorBoundary.tsx`
- 包裹每个工具路由
- 展示友好的错误 UI + "返回首页"按钮
- 可选: 上报错误到 console 或简单 localStorage 日志

---

### 1.4 CI 增强

**动机**: 当前 CI 只跑 build，不检查类型和格式。

**方案**:
- deploy.yml 中 `npm run build` 前加 `npx tsc --noEmit`
- 可选加 `eslint --max-warnings 0`
- 确保新 PR 不会引入类型错误

---

## 二、用户体验增强

### 2.1 全局快捷键搜索 (Ctrl+K / Cmd+K)

**动机**: 工具越来越多，开发者习惯键盘导航。

**方案**:
- 全局监听 `Ctrl+K`
- 弹出 Command Palette 风格的浮层
- 输入即搜索（复用首页的 tools/apps 数据）
- 回车跳转、Esc 关闭
- 可展示最近使用

---

### 2.2 最近使用 / 收藏

**动机**: 首页项目越来越多，找常用工具靠记忆。

**方案**:
- localStorage 记录最近打开的 5 个工具
- 首页顶部展示"最近使用"横条（可折叠）
- 可选: 收藏/置顶功能（星标）

---

### 2.3 统一 Toast 通知系统

**动机**: 各工具各自实现通知，体验不一致。

**方案**:
- 新建 `src/components/Toast.tsx` + context provider
- 全局 `useToast()` hook
- 支持 success / error / info 三种类型
- 自动消失 + 可手动关闭
- 独立 HTML apps 各自处理（不强制统一）

---

### 2.4 清理 hello app

**动机**: 占首页一个格子但对用户无意义。

**方案**:
- 从 apps/ 中移除，或改为"模板说明/开发者文档"
- 如果要保留给开发参考，可以在 meta.json 加 `"hidden": true` 字段，首页不展示

---

## 三、新工具规划（按优先级）

| 优先级 | 工具 | 说明 |
|--------|------|------|
| P0 | Base64 编解码 | 文本/文件 Base64 互转，日常高频 |
| P0 | URL 编解码 | encodeURI / decodeURI 可视化 |
| P1 | 正则测试器 | 输入正则+测试文本，高亮匹配，显示分组 |
| P1 | 文本 Diff | 左右双栏对比，高亮差异行 |
| P2 | 二维码生成 | 输入文本生成二维码，可下载 PNG/SVG |

---

## 四、代码结构优化

### 4.1 拆分 App.tsx

当前 App.tsx 417 行承载: 路由、首页组件、changelog/about 内联页面、工具注册。

**拆分目标**:
- `src/pages/Home.tsx` — 首页组件（搜索、分类、网格）
- `src/pages/About.tsx` — 关于页
- `src/pages/ChangelogPage.tsx` — 更新日志页
- `src/data/routes.ts` — 路由表 + pageTitleMap + 工具注册数据
- `src/App.tsx` — 只负责路由分发，保持精简

---

## 五、不做的事

- ~~测试文件~~ — 当前阶段暂不投入
- ~~工具间跳转/面包屑~~ — 独立 HTML apps 结构决定了这不实际

---

## 六、实施顺序建议

1. **App.tsx 拆分** — 先整理结构再加功能
2. **Error Boundary** — 基础防御
3. **统一 Toast** — 后续功能会依赖它
4. **暗色模式** — 用户感知最大的改进
5. **Ctrl+K 搜索** — 提升效率
6. **最近使用** — 顺便做了
7. **清理 hello** — 顺手
8. **PWA** — 锦上添花
9. **新工具** — 逐个添加
10. **CI 增强** — 持续改进
