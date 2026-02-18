# 常见问题

使用 Plan Viewer 过程中可能遇到的问题及解决方案。

## 安装问题

### Rust 安装失败

**问题**: 运行 `rustc --version` 提示命令未找到。

**解决方案**:
1. 确认 Rust 已正确安装
2. 重启终端或重新加载环境变量
3. 检查 PATH 是否包含 Rust 的 bin 目录

::: details Windows PATH 设置
```
%USERPROFILE%\.cargo\bin
%USERPROFILE%\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin
```
:::

### pnpm 安装缓慢

**问题**: `pnpm install` 执行很慢。

**解决方案**:
配置国内镜像源：

```bash
pnpm config set registry https://registry.npmmirror.com
```

### Windows 构建失败

**问题**: 出现链接器错误。

**解决方案**:
1. 确认安装了 Visual Studio Build Tools
2. 选择 "Desktop development with C++" 工作负载
3. 重启电脑后重试

## 运行时问题

### WebView2 未找到

**问题**: Windows 上提示 WebView2 未安装。

**解决方案**:
- Windows 10/11 通常已预装
- 手动下载：[WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### 计划文件不显示

**问题**: Plan Viewer 打开后列表为空。

**解决方案**:
1. 确认 `~/.claude/plans/` 目录存在
2. 检查目录中是否有 `.md` 文件
3. 查看控制台是否有错误信息

### Mermaid 图表不渲染

**问题**: Mermaid 代码块显示为普通代码。

**解决方案**:
1. 检查网络连接（Mermaid 通过 CDN 加载）
2. 检查代码块语法是否正确：
   ```markdown
   ```mermaid
   graph TD
       A --> B
   ```
   ```

### 文件监听不工作

**问题**: 修改计划文件后视图未更新。

**解决方案**:
1. 重启 Plan Viewer
2. 检查文件权限
3. 查看 Rust 后端日志

## 评论问题

### 评论无法保存

**问题**: 添加评论后未写入文件。

**解决方案**:
1. 检查文件是否有写入权限
2. 确认磁盘空间充足
3. 查看控制台错误信息

### 评论格式错误

**问题**: 评论显示异常。

**解决方案**:
确保评论格式正确：

```markdown
### 💬 COMMENT (re: "Section Title")

> 评论内容

_— Reviewer, YYYY/MM/DD HH:MM_
```

## 性能问题

### 应用启动慢

**可能原因**:
- 首次启动需要编译 Rust 代码
- 计划文件过多

**解决方案**:
- 使用 `pnpm tauri build` 构建发布版本
- 定期清理旧计划文件

### 内存占用高

**可能原因**:
- 大型 Mermaid 图表
- 过多的文件监听

**解决方案**:
- 关闭不需要的计划
- 重启应用释放内存

## 其他问题

### 如何更改窗口大小？

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "app": {
    "windows": [{
      "width": 1400,
      "height": 900
    }]
  }
}
```

### 如何更改应用名称？

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "productName": "Your App Name"
}
```

### 如何查看调试日志？

开发模式下，日志会输出到终端。也可以在应用中按 `F12` 打开开发者工具。

## 获取帮助

如果以上方案都无法解决问题：

1. 查看 [GitHub Issues](https://github.com/mekalz/plan_viewer/issues)
2. 提交新的 Issue，包含：
   - 操作系统和版本
   - 错误信息截图
   - 复现步骤
