// ── 文件系统监听器 ───────────────────────────────────────

import * as vscode from 'vscode';

/**
 * 文件监听器（支持多目录）
 *
 * 监听指定目录下 .md 文件的变化，
 * 自动触发回调。
 *
 * 使用 300ms 去抖避免频繁刷新。
 */
export class FileWatcher {
  private watchers: vscode.FileSystemWatcher[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly debounceMs = 300;

  constructor(
    private readonly directories: string[],
    private readonly onFileChanged: () => void,
  ) { }

  /** 启动监听 */
  start(): vscode.Disposable[] {
    const handler = () => this.debounce();

    for (const dir of this.directories) {
      try {
        const pattern = new vscode.RelativePattern(dir, '**/*.md');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidChange(handler);
        watcher.onDidCreate(handler);
        watcher.onDidDelete(handler);

        this.watchers.push(watcher);
      } catch {
        // 目录不存在时跳过
      }
    }

    return [...this.watchers];
  }

  /** 停止监听 */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    for (const w of this.watchers) {
      w.dispose();
    }
    this.watchers = [];
  }

  private debounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.onFileChanged();
    }, this.debounceMs);
  }
}
