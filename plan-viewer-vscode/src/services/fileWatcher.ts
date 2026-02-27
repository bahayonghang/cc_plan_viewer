// ── 文件系统监听器 ───────────────────────────────────────

import * as vscode from 'vscode';

/** 文件变更类型 */
export type FileChangeType = 'change' | 'create' | 'delete';

/**
 * 文件监听器（支持多目录）
 *
 * 监听指定目录下 .md 文件的变化，
 * 自动触发回调，并传递变更的文件 URI 和变更类型。
 *
 * 使用 300ms 去抖避免频繁刷新。
 */
export class FileWatcher {
  private watchers: vscode.FileSystemWatcher[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly debounceMs = 300;

  /** 去抖期间记录最后一次变更的信息 */
  private lastChangedUri: vscode.Uri | undefined;
  private lastChangeType: FileChangeType | undefined;

  constructor(
    private readonly directories: string[],
    private readonly onFileChanged: (uri: vscode.Uri, changeType: FileChangeType) => void,
  ) { }

  /** 启动监听 */
  start(): vscode.Disposable[] {
    for (const dir of this.directories) {
      try {
        const pattern = new vscode.RelativePattern(dir, '**/*.md');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidChange((uri) => this.debounce(uri, 'change'));
        watcher.onDidCreate((uri) => this.debounce(uri, 'create'));
        watcher.onDidDelete((uri) => this.debounce(uri, 'delete'));

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

  private debounce(uri: vscode.Uri, changeType: FileChangeType): void {
    this.lastChangedUri = uri;
    this.lastChangeType = changeType;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      if (this.lastChangedUri && this.lastChangeType) {
        this.onFileChanged(this.lastChangedUri, this.lastChangeType);
      }
    }, this.debounceMs);
  }
}
