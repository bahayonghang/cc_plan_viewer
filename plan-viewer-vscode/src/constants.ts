// ── 常量定义 ────────────────────────────────────────────────

import type { CommentType } from './types';

/** 评论类型 → Emoji 映射 */
export const COMMENT_EMOJI: Record<CommentType, string> = {
  comment: '💬',
  suggestion: '💡',
  question: '❓',
  approve: '✅',
  reject: '❌',
};

/** Emoji → 评论类型 反向映射 */
export const EMOJI_TO_TYPE: Record<string, CommentType> = {
  '💬': 'comment',
  '💡': 'suggestion',
  '❓': 'question',
  '✅': 'approve',
  '❌': 'reject',
};

/** Review Comments 区域标记 */
export const REVIEW_MARKER = '## 📝 Review Comments';

/** 评论 ID 前缀 */
export const COMMENT_ID_PREFIX = 'comment-';

/** 选区文本截断长度 */
export const SELECTED_TEXT_EXCERPT_LENGTH = 80;
