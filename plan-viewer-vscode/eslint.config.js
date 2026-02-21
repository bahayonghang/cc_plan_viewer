// @ts-check
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  // 忽略构建产物
  {
    ignores: ['dist/**', 'dist-webview/**', 'node_modules/**', '*.js'],
  },
  // TypeScript 源码规则
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    extends: [...tseslint.configs.recommended],
    rules: {
      // 允许显式 any（VSCode API 中有合理用途）
      '@typescript-eslint/no-explicit-any': 'warn',
      // 未使用变量报错，忽略以 _ 开头的参数
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
