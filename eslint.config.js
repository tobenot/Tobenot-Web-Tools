import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

/*
 * ESLint 配置。
 *
 * 引入动机：此前 CI 只有 tsc 一道门禁，像「在 useMemo 里 setState」
 * 这类问题类型检查发现不了，只能靠人眼 review。
 * react-hooks 规则集正是为这类隐患设计的。
 */
export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'apps/**/*.html'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // 空 catch 是本项目的常见且合理写法（localStorage 不可用时静默降级）
      'no-empty': ['error', { allowEmptyCatch: true }],

      // 未使用变量：允许下划线前缀占位（如 replace 回调里的 _match）
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      /*
       * 渲染 CDN 脚本产物与第三方数据时确实需要 any（window.marked 等），
       * 全面禁止会产生大量噪音，降级为警告以保留信号。
       */
      '@typescript-eslint/no-explicit-any': 'warn',

      /*
       * set-state-in-effect（react-hooks v7 新增）会把「异步加载时设置
       * loading/结果状态」这类必要写法也一并报错。本项目大量工具依赖
       * CDN 与远程数据，属于该规则说明中的「与外部系统同步」正当场景。
       * 保留为警告：既不阻塞 CI，也不丢失信号。
       */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  /* 构建脚本运行在 Node 下 */
  {
    files: ['scripts/**/*.mjs', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
    },
  },
  /* vite.config.ts 是 TS 且运行在 Node 下 */
  {
    files: ['vite.config.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
    },
  },
  /* Service Worker 有自己的全局环境 */
  {
    files: ['public/sw.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.browser },
    },
  },
)
