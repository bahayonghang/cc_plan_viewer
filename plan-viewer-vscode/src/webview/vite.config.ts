import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: '../../dist-webview',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name][extname]',
        // mermaid 单独分包：体积约 800KB，仅在含 Mermaid 图表时按需加载
        // CSP 已配置 webview.cspSource 允许加载本地分包文件
        manualChunks: {
          mermaid: ['mermaid'],
        },
      },
    },
    target: 'es2022',
    // mermaid 核心分包约 535kB（不可压缩，仅在含图表时按需加载），高于默认 500kB 阈值
    chunkSizeWarningLimit: 600,
    cssCodeSplit: false, // 输出单个 style.css
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
});
