import { defineConfig } from 'vitepress'

export default defineConfig({
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/' },
          { text: 'Features', link: '/features/' },
          { text: 'Development', link: '/development/' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Quick Start', link: '/guide/' },
                { text: 'Installation', link: '/guide/installation' },
                { text: 'Basic Usage', link: '/guide/basic-usage' },
                { text: 'Review Workflow', link: '/guide/review-workflow' },
                { text: 'FAQ', link: '/guide/faq' },
              ],
            },
          ],
          '/features/': [
            {
              text: 'Features',
              items: [
                { text: 'Overview', link: '/features/' },
                { text: 'Comment System', link: '/features/comments' },
                { text: 'Mermaid Diagrams', link: '/features/mermaid' },
                { text: 'File Watcher', link: '/features/file-watcher' },
                { text: 'Themes', link: '/features/themes' },
              ],
            },
          ],
          '/development/': [
            {
              text: 'Development',
              items: [
                { text: 'Getting Started', link: '/development/' },
                { text: 'Architecture', link: '/development/architecture' },
              ],
            },
          ],
        },
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © 2024 anthropic-community',
        },
      },
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/' },
          { text: '功能', link: '/zh/features/' },
          { text: '开发', link: '/zh/development/' },
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '入门',
              items: [
                { text: '快速开始', link: '/zh/guide/' },
                { text: '安装', link: '/zh/guide/installation' },
                { text: '基本使用', link: '/zh/guide/basic-usage' },
                { text: '审查工作流', link: '/zh/guide/review-workflow' },
                { text: '常见问题', link: '/zh/guide/faq' },
              ],
            },
          ],
          '/zh/features/': [
            {
              text: '功能',
              items: [
                { text: '概览', link: '/zh/features/' },
                { text: '评论系统', link: '/zh/features/comments' },
                { text: 'Mermaid 图表', link: '/zh/features/mermaid' },
                { text: '文件监听', link: '/zh/features/file-watcher' },
                { text: '主题', link: '/zh/features/themes' },
              ],
            },
          ],
          '/zh/development/': [
            {
              text: '开发',
              items: [
                { text: '开发指南', link: '/zh/development/' },
                { text: '架构', link: '/zh/development/architecture' },
              ],
            },
          ],
        },
        footer: {
          message: '基于 MIT 协议发布。',
          copyright: 'Copyright © 2024 anthropic-community',
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/anthropic-community/plan-viewer-vscode',
      },
    ],
    search: {
      provider: 'local',
    },
  },
})
