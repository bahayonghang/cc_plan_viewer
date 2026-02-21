# 主题

Plan Viewer 自动适配 VS Code 的当前配色主题，无论你偏好深色还是浅色模式，都能提供一致的阅读体验。

## 主题检测

Webview 面板继承 VS Code 的 CSS 自定义属性，切换主题时这些属性随之变化。Plan Viewer 使用这些属性为 Markdown 内容区域和评论卡片设置样式。

此外，Mermaid 图表渲染器会根据 VS Code 的 `window.activeColorTheme.kind` 明确切换主题：

| VS Code 主题类型 | Mermaid 主题 |
|---|---|
| 浅色（`1`） | `default` |
| 深色（`2`） | `dark` |
| 高对比度（`3`） | `dark` |

## 可配置的阅读选项

两个设置让你独立于 VS Code 主题调整阅读体验：

### 字体大小

**设置：** `planViewer.fontSize`
**默认值：** `14`
**范围：** 10–24 px

```json
// settings.json
{
  "planViewer.fontSize": 16
}
```

### 行高

**设置：** `planViewer.lineHeight`
**默认值：** `1.7`
**范围：** 1.2–2.5

```json
{
  "planViewer.lineHeight": 1.8
}
```

修改后立即生效——Webview 会更新其 CSS 变量（`--user-font-size`、`--user-line-height`），无需重新加载。

## 访问设置

打开 VS Code 设置（`Ctrl+,`）并搜索 `planViewer`，或点击 Plans 侧边栏工具栏中的 **⚙**（设置）图标。
