// ── 评论双向同步 ─────────────────────────────────────────
// 移植自 plan.rs:319-361 sync_comments_with_plan()

import type { Comment } from '../types';
import { buildCommentBlock } from './commentBuilder';
import { parseCommentsFromPlan } from './commentParser';
import { generateCommentId } from './utils';

/**
 * 双向同步评论: JSON 存储 ↔ Plan Markdown 嵌入
 *
 * 算法:
 * 1. Direction 1: 遍历 JSON 评论，保留仍存在于 Plan 内容中的
 * 2. Direction 2: 解析 Plan 中嵌入的评论，添加 JSON 中缺失的
 *
 * @param planId - Plan 标识符
 * @param content - Plan Markdown 文本内容
 * @param storedComments - 从 JSON 存储加载的评论列表
 * @returns 同步后的评论列表及是否发生变更
 */
export function syncCommentsWithPlan(
  planId: string,
  content: string,
  storedComments: Comment[],
): { comments: Comment[]; changed: boolean } {
  const originalCount = storedComments.length;

  // 预计算所有 comment block（避免重复生成）
  const commentBlocks: Array<{ comment: Comment; block: string }> = storedComments.map(c => ({
    comment: c,
    block: buildCommentBlock(c),
  }));

  // Direction 1: 保留存在于 plan 文件中的评论
  const comments: Comment[] = [];
  const existingBlocks = new Set<string>();

  for (const { comment, block } of commentBlocks) {
    if (content.includes(block)) {
      comments.push(comment);
      existingBlocks.add(block);
    }
  }

  // Direction 2: 添加 plan 文件中存在但 JSON 中缺失的评论
  const planComments = parseCommentsFromPlan(planId, content);
  for (const pc of planComments) {
    const candidate = buildCommentBlock(pc);
    if (!existingBlocks.has(candidate)) {
      // 分配新 ID
      const newComment: Comment = {
        ...pc,
        id: generateCommentId(),
      };
      existingBlocks.add(candidate);
      comments.push(newComment);
    }
  }

  return {
    comments,
    changed: comments.length !== originalCount,
  };
}
