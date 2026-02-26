// ── OpenSpec TreeItem 子类 ───────────────────────────────

import * as vscode from 'vscode';
import type { OpenSpecChange, OpenSpecArtifact, OpenSpecArtifactType } from '../types';

/** Artifact 类型 → Codicon 图标 */
const ARTIFACT_ICON_MAP: Record<OpenSpecArtifactType, string> = {
    proposal: 'note',
    design: 'tools',
    tasks: 'tasklist',
    spec: 'file-code',
    other: 'file',
};

/**
 * 分组节点 (Active Changes / Specifications / Archived)
 */
export class OpenSpecGroupItem extends vscode.TreeItem {
    public readonly groupType: 'changes' | 'specs' | 'archive';

    constructor(groupType: 'changes' | 'specs' | 'archive', count: number) {
        const labels: Record<string, string> = {
            changes: 'Active Changes',
            specs: 'Specifications',
            archive: 'Archived',
        };
        const icons: Record<string, string> = {
            changes: 'zap',
            specs: 'library',
            archive: 'archive',
        };

        super(
            labels[groupType],
            groupType === 'archive'
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.Expanded,
        );

        this.groupType = groupType;
        this.iconPath = new vscode.ThemeIcon(icons[groupType]);
        this.description = count > 0 ? `(${count})` : '';
        this.contextValue = 'openspecGroup';
    }
}

/**
 * 变更节点 (单个 change 目录)
 */
export class OpenSpecChangeItem extends vscode.TreeItem {
    public readonly change: OpenSpecChange;

    constructor(change: OpenSpecChange) {
        super(change.id, vscode.TreeItemCollapsibleState.Collapsed);

        this.change = change;
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'openspecChange';

        // 构建 tooltip
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${change.id}**\n\n`);
        const artifacts: string[] = [];
        if (change.hasProposal) artifacts.push('📝 proposal.md');
        if (change.hasDesign) artifacts.push('🏗️ design.md');
        if (change.hasTasks) artifacts.push('☑️ tasks.md');
        if (change.hasSpecs) artifacts.push('📂 specs/');
        if (artifacts.length > 0) {
            md.appendMarkdown(`Artifacts: ${artifacts.join(', ')}\n\n`);
        }
        if (change.taskProgress) {
            md.appendMarkdown(`Progress: ${change.taskProgress.done}/${change.taskProgress.total} tasks done`);
        }
        md.appendMarkdown(`\n\n路径: \`${change.path}\``);
        this.tooltip = md;

        // 显示进度作为 description
        if (change.taskProgress && change.taskProgress.total > 0) {
            this.description = `${change.taskProgress.done}/${change.taskProgress.total} done`;
        }
    }
}

/**
 * Artifact 文件节点 (proposal.md, design.md, tasks.md, etc.)
 */
export class OpenSpecArtifactItem extends vscode.TreeItem {
    public readonly artifact: OpenSpecArtifact;

    constructor(artifact: OpenSpecArtifact, progress?: { done: number; total: number }) {
        super(artifact.name, vscode.TreeItemCollapsibleState.None);

        this.artifact = artifact;
        this.iconPath = new vscode.ThemeIcon(ARTIFACT_ICON_MAP[artifact.type]);
        this.contextValue = 'openspecArtifact';

        // description: 进度 or 修改时间
        if (progress && artifact.type === 'tasks') {
            this.description = `${progress.done}/${progress.total} done`;
        } else {
            this.description = timeAgo(new Date(artifact.modified));
        }

        // 点击时在 Webview 中打开
        this.command = {
            command: 'planViewer.openArtifact',
            title: 'Open Artifact',
            arguments: [artifact.path],
        };
    }
}

/**
 * 规格模块节点 (specs/ 下的目录)
 */
export class OpenSpecSpecDirItem extends vscode.TreeItem {
    public readonly specPath: string;
    public readonly files: string[];

    constructor(name: string, specPath: string, files: string[]) {
        super(
            name,
            files.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
        );

        this.specPath = specPath;
        this.files = files;
        this.iconPath = new vscode.ThemeIcon('folder-library');
        this.contextValue = 'openspecSpecDir';
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
