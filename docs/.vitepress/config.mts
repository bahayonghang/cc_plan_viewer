import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Plan Viewer',
  description: 'A Tauri desktop application for Claude Code plans',
  lang: 'zh-CN',
  
  head: [
    ['meta', { name: 'theme-color', content: '#7c3aed' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'Plan Viewer | Claude Code Plans Desktop App' }],
    ['meta', { name: 'og:description', content: 'View, annotate, and comment on Claude Code plans with native file access and live Mermaid diagram rendering' }],
  ],

  themeConfig: {
    logo: '/images/icon.svg',
    siteTitle: 'Plan Viewer',
    
    nav: [
      { text: '首页', link: '/' },
      { text: '功能介绍', link: '/features/' },
      { text: '使用指南', link: '/guide/' },
      { text: '开发文档', link: '/development/' },
      { text: 'GitHub', link: 'https://github.com/mekalz/plan_viewer' }
    ],

    sidebar: {
      '/features/': [
        {
          text: '功能介绍',
          items: [
            { text: '概览', link: '/features/' },
            { text: 'Mermaid 图表渲染', link: '/features/mermaid' },
            { text: '评论系统', link: '/features/comments' },
            { text: '主题切换', link: '/features/themes' },
            { text: '文件监听', link: '/features/file-watcher' }
          ]
        }
      ],
      '/guide/': [
        {
          text: '使用指南',
          items: [
            { text: '快速开始', link: '/guide/' },
            { text: '安装配置', link: '/guide/installation' },
            { text: '基础使用', link: '/guide/basic-usage' },
            { text: '评论工作流', link: '/guide/review-workflow' },
            { text: '常见问题', link: '/guide/faq' }
          ]
        }
      ],
      '/development/': [
        {
          text: '开发文档',
          items: [
            { text: '开发指南', link: '/development/' },
            { text: 'Tauri 开发', link: '/development/tauri' },
            { text: '项目结构', link: '/development/architecture' },
            { text: '自定义配置', link: '/development/customization' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/mekalz/plan_viewer' }
    ],

    footer: {
      message: '基于 MIT 许可证发布',
      copyright: 'Copyright © 2024-present Plan Viewer'
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换'
            }
          }
        }
      }
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },

    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  },

  markdown: {
    lineNumbers: true,
    image: {
      lazyLoading: true
    }
  },

  lastUpdated: true
})
