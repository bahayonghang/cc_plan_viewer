// ── 工具函数 ────────────────────────────────────────────────

import { COMMENT_ID_PREFIX } from '../constants';

/**
 * 生成唯一的评论 ID
 * 格式: comment-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateCommentId(): string {
  return `${COMMENT_ID_PREFIX}${crypto.randomUUID()}`;
}
