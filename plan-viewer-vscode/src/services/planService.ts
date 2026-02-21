// ── Plan 文件服务 ─────────────────────────────────────────
// 移植自 plan.rs:86-157

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import type { PlanInfo, Plan, Comment } from '../types';
import { syncCommentsWithPlan } from './commentSync';

/** 项目提取缓存条目 */
interface ProjectCacheEntry {
  project: string;
  mtime: number;
}

/** 内存缓存：key = `${planId}:${mtime}` */
const projectCache = new Map<string, ProjectCacheEntry>();

/**
 * 从文件前 N 行提取项目名称
 *
 * 优先级：
 * 1. cwd/Working directory/Project 元数据行 → 取路径最后一级目录名
 * 2. Windows 绝对路径（C:\...）→ 取目录名（若末端为文件则取父目录名）
 * 3. 代码段/链接中的相对路径 → 取首级目录名（跳过通用目录名）
 * 4. 返回空串（= 未分组）
 *
 * 注1：Unix 绝对路径（/...）已移除 —— 会误匹配中文斜杠分隔符（如"查看/评审"）
 *       和相对路径的后缀片段（如 ref/skills-desktop → /skills-desktop）
 * 注2：标题回退已移除 —— `# Plan: xxx` → "Plan" 等均为无意义垃圾组名
 */
export function extractProject(firstLines: string[]): string {
  // 优先级 1：元数据行（未来兼容，标准 Claude Code plan 几乎不含此元数据）
  const metaPattern = /^(?:cwd|working.?directory|project)\s*[:：]\s*(.+)/i;
  for (const line of firstLines) {
    const match = metaPattern.exec(line.trim());
    if (match) {
      const raw = match[1].trim().replace(/[/\\]+$/, '');
      return path.basename(raw) || raw;
    }
  }

  // 优先级 2：Windows 绝对路径（C:\... 或 D:\...）
  // 不处理 Unix 绝对路径：会误匹配中文斜杠分隔符和相对路径片段
  // 跳过常见文档示例占位符（如 D:\path\dir）
  const SKIP_WIN_NAMES = new Set(['dir', 'path', 'folder', 'temp', 'tmp', 'example', 'sample']);
  const winPathPattern = /([A-Za-z]:[/\\][^\s,;'"<>|()`\n]+)/g;
  for (const line of firstLines) {
    let winMatch: RegExpExecArray | null;
    winPathPattern.lastIndex = 0;
    while ((winMatch = winPathPattern.exec(line)) !== null) {
      const p = winMatch[1].replace(/[/\\]+$/, '');
      if (p.includes('*') || p.includes('?')) continue;
      const base = path.basename(p);
      if (!base || base === '.' || base === '..') continue;
      // 若末端为文件（含扩展名），取父目录名而非文件名
      if (/\.\w{1,10}$/.test(base)) {
        const dir = path.basename(path.dirname(p));
        if (dir && dir !== '.' && dir !== '..' && !SKIP_WIN_NAMES.has(dir)) return dir;
      } else {
        if (!SKIP_WIN_NAMES.has(base)) return base;
      }
    }
  }

  // 优先级 3：代码段或 Markdown 链接中的相对路径 → 取首级目录名
  // 匹配 `project-name/rest/of/path` 或 [label](project-name/rest/of/path)
  const SKIP_FIRST_DIRS = new Set([
    // 标准源码目录
    'src', 'dist', 'lib', 'test', 'tests', 'docs', 'scripts', 'assets',
    'public', 'static', 'build', 'config', 'utils', 'components', 'pages',
    'styles', 'types', 'hooks', 'store', 'api', 'views', 'layouts',
    'features', 'helpers', 'middleware', 'models', 'controllers', 'services',
    // 常见非项目名目录
    'ref', 'l10n', 'skills', 'node_modules',
  ]);
  const relCodePattern = /`([a-zA-Z][a-zA-Z0-9_-]+\/[^`\s]+)`/g;
  const relLinkPattern = /\[[^\]]*\]\(([a-zA-Z][a-zA-Z0-9_-]+\/[^)]+)\)/g;
  for (const line of firstLines) {
    for (const pat of [relCodePattern, relLinkPattern]) {
      let relMatch: RegExpExecArray | null;
      pat.lastIndex = 0;
      while ((relMatch = pat.exec(line)) !== null) {
        const firstDir = relMatch[1].split('/')[0];
        // 跳过通用目录名、长度 ≤ 1、以数字开头的名称
        if (firstDir && !SKIP_FIRST_DIRS.has(firstDir) && firstDir.length > 1 && !/^\d/.test(firstDir)) {
          return firstDir;
        }
      }
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
  constructor(private readonly context: vscode.ExtensionContext) {}

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
          let project: string;
          const cached = projectCache.get(cacheKey);
          if (cached) {
            project = cached.project;
          } else {
            const contentBytes = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(contentBytes).toString('utf-8');
            const firstLines = content.split('\n').slice(0, 30);
            project = extractProject(firstLines);
            projectCache.set(cacheKey, { project, mtime: stat.mtime });
          }

          // 加载评论计数
          const comments = this.loadComments(planId);

          plans.push({
            id: planId,
            name,
            path: filePath,
            modified: new Date(stat.mtime).toISOString(),
            created: new Date(stat.ctime).toISOString(),
            size: stat.size,
            commentCount: comments.length,
            project,
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
