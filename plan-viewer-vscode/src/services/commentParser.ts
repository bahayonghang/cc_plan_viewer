// ── Markdown → Comment 解析 ───────────────────────────────
// 移植自 plan.rs:237-317 parse_comments_from_plan()

import type { Comment, CommentType } from '../types';
import { EMOJI_TO_TYPE } from '../constants';
import { generateCommentId } from './utils';

/**
 * 从 Plan Markdown 内容中解析嵌入的评论块
 *
 * 识别格式:
 * ```
 * ### 💬 COMMENT (on: "selected text")
 *
 * > 评论正文
 *
 * _— Reviewer, 2024/01/15 14:30_
 * ```
 */
export function parseCommentsFromPlan(planId: string, content: string): Comment[] {
  const comments: Comment[] = [];

  // 按 "### " 分割，跳过第一块（在首个 ### 之前的内容）
  const blocks = content.split('### ').slice(1);

  for (const block of blocks) {
    const parsed = parseBlock(planId, block);
    if (parsed) {
      comments.push(parsed);
    }
  }

  return comments;
}

/**
 * 解析单个评论块
 */
function parseBlock(planId: string, block: string): Comment | null {
  // 检测 emoji 前缀，确定评论类型
  let commentType: CommentType | null = null;

  for (const [emoji, type] of Object.entries(EMOJI_TO_TYPE)) {
    if (block.startsWith(emoji)) {
      commentType = type;
      break;
    }
  }

  if (!commentType) {
    return null;
  }

  const lines = block.split('\n');
  let selectedText = '';
  let sectionTitle = '';
  const textLines: string[] = [];
  let createdAt = '';

  // 解析标题行
  const header = lines[0] ?? '';
  const headerContent = header
    .replace(new RegExp(`^[${Object.keys(EMOJI_TO_TYPE).join('')}]`), '')
    .trim()
    .replace(new RegExp(`^${commentType.toUpperCase()}`), '')
    .trim();

  // 提取 (on: "...") 或 (re: "...")
  const onMatch = headerContent.match(/\(on: "(.+?)"\)/);
  const reMatch = headerContent.match(/\(re: "(.+?)"\)/);

  if (onMatch) {
    selectedText = onMatch[1];
  } else if (reMatch) {
    sectionTitle = reMatch[1];
  }

  // 解析引用文本和时间戳
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('> ')) {
      textLines.push(line.slice(2));
    } else if (line.startsWith('_— Reviewer, ')) {
      // 解析时间戳: _— Reviewer, 2024/01/15 14:30_
      const tsStr = line.replace('_— Reviewer, ', '').replace(/_$/, '');
      createdAt = parseFormattedTimestamp(tsStr);
    } else if (line !== '' && textLines.length > 0) {
      // 多行引用中的续行
      textLines.push(line);
    }
  }

  // 必须有正文和时间戳才认为是有效评论
  if (textLines.length === 0 || !createdAt) {
    return null;
  }

  return {
    id: generateCommentId(),
    planId,
    lineNumber: null,
    lineContent: '',
    sectionTitle,
    selectedText,
    text: textLines.join('\n'),
    type: commentType,
    status: 'pending',
    createdAt,
  };
}

/**
 * 将格式化的时间戳 (YYYY/MM/DD HH:MM) 转为 ISO 8601
 */
function parseFormattedTimestamp(ts: string): string {
  try {
    // 输入: "2024/01/15 14:30"
    const [datePart, timePart] = ts.split(' ');
    if (!datePart || !timePart) return '';

    const [y, m, d] = datePart.split('/');
    const [h, min] = timePart.split(':');

    if (!y || !m || !d || !h || !min) return '';

    const date = new Date(
      parseInt(y), parseInt(m) - 1, parseInt(d),
      parseInt(h), parseInt(min)
    );

    if (isNaN(date.getTime())) return '';

    return date.toISOString();
  } catch {
    return '';
  }
}
