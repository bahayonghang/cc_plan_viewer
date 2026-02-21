// ── Comment → Markdown 格式化 ─────────────────────────────
// 移植自 plan.rs:191-235 build_comment_block()

import type { Comment } from '../types';
import { COMMENT_EMOJI, SELECTED_TEXT_EXCERPT_LENGTH } from '../constants';

/**
 * 将 Comment 对象格式化为 Markdown 评论块
 *
 * 格式示例:
 * ```
 * ### 💬 COMMENT (re: "Section Title")
 *
 * > 评论正文
 *
 * _— Reviewer, 2024/01/15 14:30_
 * ```
 */
export function buildCommentBlock(comment: Comment): string {
  const emoji = COMMENT_EMOJI[comment.type] ?? '💬';

  let header = `### ${emoji} ${comment.type.toUpperCase()}`;

  // 附加选区或 section 上下文
  if (comment.selectedText) {
    const excerpt = comment.selectedText.length > SELECTED_TEXT_EXCERPT_LENGTH
      ? `${comment.selectedText.slice(0, SELECTED_TEXT_EXCERPT_LENGTH)}...`
      : comment.selectedText;
    header += ` (on: "${excerpt}")`;
  } else if (comment.sectionTitle) {
    header += ` (re: "${comment.sectionTitle}")`;
  }

  // 行号标注
  if (comment.lineNumber != null) {
    header += ` [Line ${comment.lineNumber}]`;
  }

  // 引用格式正文
  const quotedText = comment.text
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');

  // 格式化时间戳
  const ts = formatTimestamp(comment.createdAt);

  return `${header}\n\n${quotedText}\n\n_— Reviewer, ${ts}_\n\n`;
}

/**
 * 将 ISO 8601 时间戳格式化为 YYYY/MM/DD HH:MM
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().replace(/T/, ' ').slice(0, 16).replace(/-/g, '/');
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${h}:${min}`;
  } catch {
    return new Date().toISOString().replace(/T/, ' ').slice(0, 16).replace(/-/g, '/');
  }
}
