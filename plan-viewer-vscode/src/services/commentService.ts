// ── 评论 CRUD 服务 ───────────────────────────────────────

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { Comment, CommentData } from '../types';
import { PlanService } from './planService';
import { buildCommentBlock } from './commentBuilder';
import { injectCommentIntoContent, removeCommentFromContent } from './commentInjector';
import { generateCommentId } from './utils';

/**
 * 评论 CRUD 服务
 *
 * 存储策略:
 * - 主存储: VSCode globalState（JSON 序列化）
 * - 可选: 嵌入到 Plan Markdown 的 ## 📝 Review Comments 区域
 */
export class CommentService {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly planService: PlanService,
  ) {}

  /** 添加评论 */
  async addComment(planId: string, data: CommentData): Promise<Comment | null> {
    const now = new Date().toISOString();
    const newComment: Comment = {
      id: generateCommentId(),
      planId,
      lineNumber: null,
      lineContent: '',
      sectionTitle: data.sectionTitle,
      selectedText: data.selectedText,
      text: data.text,
      type: data.commentType,
      status: 'pending',
      createdAt: now,
    };

    // 保存到 globalState
    const comments = this.planService.loadComments(planId);
    comments.push(newComment);
    this.planService.saveComments(planId, comments);

    // 可选: 嵌入到 Markdown 文件
    const embedEnabled = vscode.workspace
      .getConfiguration('planViewer')
      .get<boolean>('embedCommentsInMarkdown', true);

    if (embedEnabled) {
      await this.injectCommentIntoFile(planId, newComment);
    }

    return newComment;
  }

  /** 删除评论 */
  async deleteComment(planId: string, commentId: string): Promise<boolean> {
    const comments = this.planService.loadComments(planId);
    const target = comments.find(c => c.id === commentId);

    if (!target) return false;

    // 从 globalState 移除
    const filtered = comments.filter(c => c.id !== commentId);
    this.planService.saveComments(planId, filtered);

    // 可选: 从 Markdown 文件移除
    const embedEnabled = vscode.workspace
      .getConfiguration('planViewer')
      .get<boolean>('embedCommentsInMarkdown', true);

    if (embedEnabled) {
      await this.removeCommentFromFile(planId, target);
    }

    return true;
  }

  // ── 文件操作 ────────────────────────────────────────

  private async injectCommentIntoFile(planId: string, comment: Comment): Promise<void> {
    const filePath = path.join(this.planService.getPlansDir(), `${planId}.md`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const newContent = injectCommentIntoContent(content, comment);
      fs.writeFileSync(filePath, newContent, 'utf-8');
    } catch (e) {
      console.error('[Plan Viewer] 评论注入失败:', e);
    }
  }

  private async removeCommentFromFile(planId: string, comment: Comment): Promise<void> {
    const filePath = path.join(this.planService.getPlansDir(), `${planId}.md`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const newContent = removeCommentFromContent(content, comment);
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
      }
    } catch (e) {
      console.error('[Plan Viewer] 评论移除失败:', e);
    }
  }
}
