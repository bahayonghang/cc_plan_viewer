// ── Plan 文件服务 ─────────────────────────────────────────
// 移植自 plan.rs:86-157

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import type { PlanInfo, Plan, Comment } from '../types';
import { syncCommentsWithPlan } from './commentSync';

/** 项目提取缓存条目 */
interface ProjectCacheEntry {
  title: string;
  mtime: number;
}

/** 内存缓存：key = `${planId}:${mtime}` */
const projectCache = new Map<string, ProjectCacheEntry>();

/**
 * 从文件前 N 行提取标题
 * 查找第一个 Markdown 标题 (# 标题)
 */
export function extractTitle(firstLines: string[]): string {
  for (const line of firstLines) {
    const m = line.match(/^#+\s+(.+)/);
    if (m) {
      return m[1].replace(/\r$/, '').trim();
    }
  }
  return '';
}

/**
 * Plan 文件服务
 *
 * 负责:
 * - 列出 plans 目录下的 .md 文件
 * - 加载完整 plan 数据（内容 + 评论同步）
 * - 管理评论的持久化（VSCode globalState）
 */
export class PlanService {
  constructor(private readonly context: vscode.ExtensionContext) { }

  /** 获取 plans 目录路径 */
  getPlansDir(): string {
    const config = vscode.workspace.getConfiguration('planViewer');
    const custom = config.get<string>('plansDirectory', '');
    if (custom) return custom;

    return path.join(os.homedir(), '.claude', 'plans');
  }

  /** 获取 plan-reviews 评论目录路径 */
  getCommentsDir(): string {
    return path.join(os.homedir(), '.claude', 'plan-reviews');
  }

  /** 列出所有 plan 文件，按修改时间降序 */
  async listPlans(): Promise<PlanInfo[]> {
    const plansDir = this.getPlansDir();
    const plans: PlanInfo[] = [];

    try {
      const dirUri = vscode.Uri.file(plansDir);
      const entries = await vscode.workspace.fs.readDirectory(dirUri);

      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || !name.endsWith('.md')) {
          continue;
        }

        const filePath = path.join(plansDir, name);
        const fileUri = vscode.Uri.file(filePath);

        try {
          const stat = await vscode.workspace.fs.stat(fileUri);
          const planId = name.replace(/\.md$/, '');

          // 项目提取（带内存缓存，以 planId:mtime 为 key）
          const cacheKey = `${planId}:${stat.mtime}`;
          let title: string;
          const cached = projectCache.get(cacheKey);
          if (cached) {
            title = cached.title;
          } else {
            const contentBytes = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(contentBytes).toString('utf-8');
            const firstLines = content.split('\n').slice(0, 30);
            title = extractTitle(firstLines);
            projectCache.set(cacheKey, { title, mtime: stat.mtime });
          }

          // 加载评论计数
          const comments = this.loadComments(planId);

          plans.push({
            id: planId,
            name: title || planId,
            path: filePath,
            modified: new Date(stat.mtime).toISOString(),
            created: new Date(stat.ctime).toISOString(),
            size: stat.size,
            commentCount: comments.length,
            project: '',
          });
        } catch {
          // 跳过无法读取的文件
        }
      }
    } catch {
      // 目录不存在或不可读
    }

    // 按修改时间降序排序
    plans.sort((a, b) => b.modified.localeCompare(a.modified));

    return plans;
  }

  /** 加载完整 plan 数据 */
  async getPlan(planId: string): Promise<Plan | null> {
    const plansDir = this.getPlansDir();
    const filePath = path.join(plansDir, `${planId}.md`);
    const fileUri = vscode.Uri.file(filePath);

    try {
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      const content = Buffer.from(contentBytes).toString('utf-8');
      const stat = await vscode.workspace.fs.stat(fileUri);

      // 双向同步评论
      const storedComments = this.loadComments(planId);
      const { comments, changed } = syncCommentsWithPlan(planId, content, storedComments);

      if (changed) {
        this.saveComments(planId, comments);
      }

      return {
        id: planId,
        name: `${planId}.md`,
        path: filePath,
        content,
        modified: new Date(stat.mtime).toISOString(),
        comments,
      };
    } catch {
      return null;
    }
  }

  /** 从 globalState 加载评论 */
  loadComments(planId: string): Comment[] {
    const key = `planViewer.comments.${planId}`;
    return this.context.globalState.get<Comment[]>(key, []);
  }

  /** 保存评论到 globalState */
  saveComments(planId: string, comments: Comment[]): void {
    const key = `planViewer.comments.${planId}`;
    this.context.globalState.update(key, comments);
  }
}
