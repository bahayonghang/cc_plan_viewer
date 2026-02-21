# Themes

Plan Viewer adapts to VS Code's active color theme automatically, providing a consistent reading experience whether you prefer dark or light mode.

## Theme Detection

The webview panel inherits VS Code's CSS custom properties, which change when you switch themes. Plan Viewer uses these to style the Markdown content area and comment cards.

Additionally, the Mermaid diagram renderer is explicitly switched between `dark` and `default` themes based on VS Code's `window.activeColorTheme.kind`:

| VS Code theme kind | Mermaid theme |
|---|---|
| Light (`1`) | `default` |
| Dark (`2`) | `dark` |
| High Contrast (`3`) | `dark` |

## Configurable Reading Options

Two settings let you fine-tune the reading experience independently of the VS Code theme:

### Font Size

**Setting:** `planViewer.fontSize`
**Default:** `14`
**Range:** 10–24 px

```json
// settings.json
{
  "planViewer.fontSize": 16
}
```

### Line Height

**Setting:** `planViewer.lineHeight`
**Default:** `1.7`
**Range:** 1.2–2.5

```json
{
  "planViewer.lineHeight": 1.8
}
```

Changes take effect immediately — the webview updates its CSS variables (`--user-font-size`, `--user-line-height`) without requiring a reload.

## Accessing Settings

Open VS Code Settings (`Ctrl+,`) and search for `planViewer`, or click the **⚙** (Settings) icon in the Plans sidebar toolbar.
