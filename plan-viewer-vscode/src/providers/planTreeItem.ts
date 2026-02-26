// ── Plan TreeItem 子类 ───────────────────────────────────

import * as vscode from 'vscode';
import type { PlanInfo } from '../types';

/**
 * Plan 列表项 TreeItem
 */
export class PlanTreeItem extends vscode.TreeItem {
  constructor(public readonly plan: PlanInfo) {
    super(PlanTreeItem.cleanPlanName(plan.name), vscode.TreeItemCollapsibleState.None);

    this.id = plan.id;
    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();

    // 点击时触发 openPlan 命令
    this.command = {
      command: 'planViewer.openPlan',
      title: 'Open Plan',
      arguments: [plan.id],
    };

    // 上下文菜单标识
    this.contextValue = 'planItem';

    // 动态分配彩色图标
    this.iconPath = this.getIconForPlan(plan.name);
  }

  private static cleanPlanName(name: string): string {
    return name
      .replace(/^(Plan|Fix|Feature|修复|重构):\s*/i, '')
      .replace(/\s*-\s*Implementation Plan$/i, '')
      .replace(/\s*Implementation Plan$/i, '')
      .trim() || name;
  }

  private getIconForPlan(name: string): vscode.ThemeIcon {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('fix') || lowerName.includes('bug') || lowerName.includes('修复')) {
      return new vscode.ThemeIcon('wrench', new vscode.ThemeColor('problemsWarningIcon.foreground'));
    }
    if (lowerName.includes('refactor') || lowerName.includes('重构')) {
      return new vscode.ThemeIcon('zap', new vscode.ThemeColor('symbolIcon.methodForeground'));
    }
    if (lowerName.includes('ui') || lowerName.includes('界面') || lowerName.includes('页')) {
      return new vscode.ThemeIcon('window', new vscode.ThemeColor('symbolIcon.classForeground'));
    }
    if (lowerName.includes('doc') || lowerName.includes('readme') || lowerName.includes('文档')) {
      return new vscode.ThemeIcon('book', new vscode.ThemeColor('textLink.foreground'));
    }
    if (lowerName.includes('feature') || lowerName.includes('feat') || lowerName.includes('支持') || lowerName.includes('集成')) {
      return new vscode.ThemeIcon('lightbulb', new vscode.ThemeColor('charts.green'));
    }
    if (lowerName.includes('test') || lowerName.includes('测试')) {
      return new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.blue'));
    }

    return new vscode.ThemeIcon('markdown', new vscode.ThemeColor('symbolIcon.stringForeground'));
  }

  private buildDescription(): string {
    const parts: string[] = [];

    // 相对时间
    parts.push(timeAgo(new Date(this.plan.modified)));

    // 评论计数
    if (this.plan.commentCount > 0) {
      parts.push(`💬 ${this.plan.commentCount}`);
    }

    return parts.join(' · ');
  }

  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${this.plan.name}**\n\n`);
    md.appendMarkdown(`- 创建时间: ${new Date(this.plan.created).toLocaleString()}\n`);
    md.appendMarkdown(`- 修改时间: ${new Date(this.plan.modified).toLocaleString()}\n`);
    md.appendMarkdown(`- 文件大小: ${formatSize(this.plan.size)}\n`);
    md.appendMarkdown(`- 评论数: ${this.plan.commentCount}\n`);
    md.appendMarkdown(`- 路径: \`${this.plan.path}\``);
    return md;
  }
}

/**
 * 简单的相对时间格式化
 */
function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * 文件大小格式化
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
