// ── 评论注入/移除 ─────────────────────────────────────────
// 移植自 plan.rs:446-527

import type { Comment } from '../types';
import { REVIEW_MARKER } from '../constants';
import { buildCommentBlock } from './commentBuilder';

/**
 * 将评论注入到 Plan Markdown 内容中
 *
 * 策略:
 * - 有 selectedText: 在选中文本所在段落之后插入
 * - 无 selectedText: 追加到 Review Comments 区域底部
 *
 * @returns 注入后的新内容
 */
export function injectCommentIntoContent(content: string, comment: Comment): string {
  const block = buildCommentBlock(comment);
  let result = content;

  if (comment.selectedText) {
    // 在选区文本后的段落间插入
    const pos = result.indexOf(comment.selectedText);
    if (pos !== -1) {
      const endOfMatch = pos + comment.selectedText.length;
      const rest = result.slice(endOfMatch);
      const nextBlank = rest.indexOf('\n\n');

      const insertPos = nextBlank !== -1
        ? endOfMatch + nextBlank
        : result.length;

      result = `${result.slice(0, insertPos)}\n\n${block}${result.slice(insertPos)}`;
    } else {
      // 回退: 选区文本未找到，追加到底部
      result = appendCommentToBottom(result, block);
    }
  } else {
    // Section 级别评论: 追加到底部
    result = appendCommentToBottom(result, block);
  }

  return result;
}

/**
 * 从 Plan Markdown 内容中移除评论
 *
 * @returns 移除后的新内容
 */
export function removeCommentFromContent(content: string, comment: Comment): string {
  const block = buildCommentBlock(comment);

  // 替换评论块为空行
  let result = content.replace(block, '\n\n');

  // 清理空的 Review Comments 区域
  if (result.includes(REVIEW_MARKER)) {
    const parts = result.split(REVIEW_MARKER);
    if (parts.length === 2 && parts[1].trim() === '') {
      result = parts[0].trimEnd();
    }
  }

  return result;
}

/**
 * 将评论块追加到 Review Comments 区域
 *
 * 如果已存在 Review Comments 标记，直接追加。
 * 否则先添加分隔线和标记，再追加。
 */
function appendCommentToBottom(content: string, block: string): string {
  let result = content;

  if (result.includes(REVIEW_MARKER)) {
    result += block;
  } else {
    result += `\n\n---\n\n${REVIEW_MARKER}\n\n${block}`;
  }

  return result;
}
