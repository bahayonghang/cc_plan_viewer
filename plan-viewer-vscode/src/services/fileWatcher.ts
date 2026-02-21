// ── 文件系统监听器 ───────────────────────────────────────

import * as vscode from 'vscode';

/**
 * Plan 文件监听器
 *
 * 监听 plans 目录下 .md 文件的变化，
 * 自动刷新列表和当前打开的 plan。
 *
 * 使用 300ms 去抖避免频繁刷新。
 */
export class FileWatcher {
  private watcher: vscode.FileSystemWatcher | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly debounceMs = 300;

  constructor(
    private readonly plansDir: string,
    private readonly onFileChanged: () => void,
  ) {}

  /** 启动监听 */
  start(): vscode.Disposable[] {
    const pattern = new vscode.RelativePattern(this.plansDir, '**/*.md');

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    const handler = () => this.debounce();

    this.watcher.onDidChange(handler);
    this.watcher.onDidCreate(handler);
    this.watcher.onDidDelete(handler);

    return [this.watcher];
  }

  /** 停止监听 */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.watcher?.dispose();
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
