# Mecha Tools 机械风 Web 工具站

- 技术栈：React + TypeScript + Tailwind CSS + Vite
- 导航：基于哈希（`#calendar` 等），方便分享直达地址
- UI：机械风暗色主题，可复用工具页模板（分享按钮、设计思路、更新日志）
- 部署：推送到 `main` 自动构建并发布到 GitHub Pages（`gh-pages` 分支）

## 开发

```bash
npm install
npm run dev
```

本地访问：`http://localhost:5173/`。

## 构建

```bash
npm run build
npm run preview
```

## 部署（GitHub Actions）

- 在仓库设置中开启 GitHub Pages（分支选择 `gh-pages`）。
- 推送到 `main` 分支将自动构建并发布到 `gh-pages` 分支。
- Vite 已设置 `base: './'`，适配二级路径部署。

## 目录结构

```
src/
  components/
  tools/
    calendar/
  utils/
```

## 约定

- 路由使用 `#` 哈希：
  - 首页：`#`
  - 日历：`#calendar`（支持 `?d=YYYY-MM-DD` 预选日期）
  - 更新日志：`#changelog`
  - 关于/设计：`#about`
