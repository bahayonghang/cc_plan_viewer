// ── OpenSpec 数据服务 ─────────────────────────────────────
// 发现和解析 openspec/ 目录结构

import * as vscode from 'vscode';
import * as path from 'path';
import type { OpenSpecChange, OpenSpecArtifact, OpenSpecArtifactType } from '../types';

/** Artifact 文件名 → 类型映射 */
const ARTIFACT_TYPE_MAP: Record<string, OpenSpecArtifactType> = {
    'proposal.md': 'proposal',
    'design.md': 'design',
    'tasks.md': 'tasks',
};

/**
 * OpenSpec 数据服务
 *
 * 负责:
 * - 从工作区发现 openspec/ 目录
 * - 列出变更、规格、归档
 * - 读取 artifact 文件内容
 * - 解析 tasks.md 进度
 */
export class OpenSpecService {
    /** 获取 openspec 目录路径 */
    getOpenSpecDir(): string | null {
        const config = vscode.workspace.getConfiguration('planViewer');
        const custom = config.get<string>('openspecDirectory', '');
        if (custom) return custom;

        // 从工作区根目录搜索
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return null;

        return path.join(workspaceFolders[0].uri.fsPath, 'openspec');
    }

    /** 列出活跃变更 (排除 archive/) */
    async listChanges(): Promise<OpenSpecChange[]> {
        const dir = this.getOpenSpecDir();
        if (!dir) return [];

        const changesDir = path.join(dir, 'changes');
        const changes: OpenSpecChange[] = [];

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(changesDir));

            for (const [name, type] of entries) {
                if (type !== vscode.FileType.Directory || name === 'archive') continue;

                const changePath = path.join(changesDir, name);
                const change = await this.scanChange(name, changePath);
                changes.push(change);
            }
        } catch {
            // 目录不存在或不可读
        }

        return changes;
    }

    /** 列出归档变更 */
    async listArchivedChanges(): Promise<OpenSpecChange[]> {
        const dir = this.getOpenSpecDir();
        if (!dir) return [];

        const archiveDir = path.join(dir, 'changes', 'archive');
        const changes: OpenSpecChange[] = [];

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(archiveDir));

            for (const [name, type] of entries) {
                if (type !== vscode.FileType.Directory) continue;

                const changePath = path.join(archiveDir, name);
                const change = await this.scanChange(name, changePath);
                changes.push(change);
            }
        } catch {
            // 目录不存在
        }

        return changes;
    }

    /** 列出规格模块 */
    async listSpecs(): Promise<{ name: string; path: string; files: string[] }[]> {
        const dir = this.getOpenSpecDir();
        if (!dir) return [];

        const specsDir = path.join(dir, 'specs');
        const specs: { name: string; path: string; files: string[] }[] = [];

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(specsDir));

            for (const [name, type] of entries) {
                if (type !== vscode.FileType.Directory) continue;

                const modPath = path.join(specsDir, name);
                const files = await this.listMdFiles(modPath);
                specs.push({ name, path: modPath, files });
            }
        } catch {
            // 目录不存在
        }

        return specs;
    }

    /** 列出变更目录下的 artifacts */
    async listArtifacts(changePath: string, changeId: string): Promise<OpenSpecArtifact[]> {
        const artifacts: OpenSpecArtifact[] = [];

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(changePath));

            for (const [name, type] of entries) {
                if (type === vscode.FileType.File && name.endsWith('.md')) {
                    const filePath = path.join(changePath, name);
                    const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
                    const artType = ARTIFACT_TYPE_MAP[name] ?? 'other';

                    artifacts.push({
                        name,
                        path: filePath,
                        changeId,
                        modified: new Date(stat.mtime).toISOString(),
                        type: artType,
                    });
                } else if (type === vscode.FileType.Directory && name === 'specs') {
                    // specs 子目录中的文件作为 spec 类型
                    const specsPath = path.join(changePath, 'specs');
                    const specEntries = await this.collectSpecFiles(specsPath, changeId);
                    artifacts.push(...specEntries);
                }
            }
        } catch {
            // 不可读
        }

        // 固定排序：proposal → design → tasks → specs → other
        const ORDER: Record<OpenSpecArtifactType, number> = { proposal: 0, design: 1, tasks: 2, spec: 3, other: 4 };
        artifacts.sort((a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9));

        return artifacts;
    }

    /** 读取 artifact 文件内容 */
    async getArtifact(filePath: string): Promise<string | null> {
        try {
            const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
            return Buffer.from(bytes).toString('utf-8');
        } catch {
            return null;
        }
    }

    /** 解析 tasks.md 中的任务进度 */
    parseTaskProgress(content: string): { done: number; total: number } {
        let done = 0;
        let total = 0;

        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (/^-\s*\[x\]/i.test(trimmed)) {
                done++;
                total++;
            } else if (/^-\s*\[\s\]/.test(trimmed)) {
                total++;
            }
        }

        return { done, total };
    }

    // ── 内部方法 ────────────────────────────────────────

    /** 扫描单个变更目录 */
    private async scanChange(id: string, changePath: string): Promise<OpenSpecChange> {
        const change: OpenSpecChange = {
            id,
            path: changePath,
            hasProposal: false,
            hasDesign: false,
            hasTasks: false,
            hasSpecs: false,
        };

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(changePath));

            for (const [name, type] of entries) {
                if (type === vscode.FileType.File) {
                    if (name === 'proposal.md') change.hasProposal = true;
                    if (name === 'design.md') change.hasDesign = true;
                    if (name === 'tasks.md') {
                        change.hasTasks = true;
                        // 解析任务进度
                        const tasksPath = path.join(changePath, 'tasks.md');
                        const content = await this.getArtifact(tasksPath);
                        if (content) {
                            change.taskProgress = this.parseTaskProgress(content);
                        }
                    }
                } else if (type === vscode.FileType.Directory && name === 'specs') {
                    change.hasSpecs = true;
                }
            }
        } catch {
            // 不可读
        }

        return change;
    }

    /** 递归收集 specs/ 目录中的 .md 文件 */
    private async collectSpecFiles(specsDir: string, changeId: string): Promise<OpenSpecArtifact[]> {
        const artifacts: OpenSpecArtifact[] = [];

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(specsDir));

            for (const [name, type] of entries) {
                const fullPath = path.join(specsDir, name);

                if (type === vscode.FileType.File && name.endsWith('.md')) {
                    const stat = await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
                    // 保留相对路径以展示 specs/capability/spec.md
                    const relName = path.relative(path.dirname(specsDir), fullPath).replace(/\\/g, '/');
                    artifacts.push({
                        name: relName,
                        path: fullPath,
                        changeId,
                        modified: new Date(stat.mtime).toISOString(),
                        type: 'spec',
                    });
                } else if (type === vscode.FileType.Directory) {
                    const subFiles = await this.collectSpecFiles(fullPath, changeId);
                    artifacts.push(...subFiles);
                }
            }
        } catch {
            // 不可读
        }

        return artifacts;
    }

    /** 列出目录中的 .md 文件名 */
    private async listMdFiles(dirPath: string): Promise<string[]> {
        const files: string[] = [];

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));
            for (const [name, type] of entries) {
                if (type === vscode.FileType.File && name.endsWith('.md')) {
                    files.push(name);
                }
            }
        } catch {
            // 不可读
        }

        return files;
    }
}
