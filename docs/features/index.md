# 功能介绍

Plan Viewer 提供了一系列强大的功能，帮助你更好地审阅和协作 Claude Code 生成的计划。

## 功能概览

<div class="feature-grid">
  <div class="feature-card">
    <h3>🖥️ 原生桌面应用</h3>
    <p>基于 Tauri 2.0 构建，Rust 后端提供高性能原生体验</p>
  </div>
  <div class="feature-card">
    <h3>📁 直接文件访问</h3>
    <p>无需 HTTP 服务器，通过 Rust 原生文件系统直接访问</p>
  </div>
  <div class="feature-card">
    <h3>📊 Mermaid 图表</h3>
    <p>实时渲染流程图、时序图、甘特图等</p>
  </div>
  <div class="feature-card">
    <h3>💬 评论系统</h3>
    <p>章节级评论和文本选择内联评论</p>
  </div>
  <div class="feature-card">
    <h3>🎨 主题切换</h3>
    <p>深色/浅色主题平滑切换</p>
  </div>
  <div class="feature-card">
    <h3>🔍 语法高亮</h3>
    <p>代码块主题自适应语法高亮</p>
  </div>
</div>

## 核心特性

### 原生文件访问

Plan Viewer 通过 Rust 后端直接访问文件系统，无需启动 HTTP 服务器。这意味着：

- 更快的文件读取速度
- 更低的资源占用
- 更好的系统集成

### 实时文件监听

使用 `notify` crate 实现文件监听，当计划文件发生变化时自动更新视图：

- 实时同步 Claude Code 的计划更新
- 自动重连机制确保稳定性
- 低延迟响应

### 双向评论同步

评论系统支持 JSON 元数据和 Markdown 块的双向同步：

- 评论自动写入计划文件
- Claude Code 可以直接读取评论
- 支持多轮审阅迭代

## 下一步

- [Mermaid 图表渲染](/features/mermaid) - 了解如何渲染各种图表
- [评论系统](/features/comments) - 学习如何添加和管理评论
- [主题切换](/features/themes) - 自定义应用外观
