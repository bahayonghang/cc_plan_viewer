// ── 共享类型定义 ────────────────────────────────────────────

/** 评论类型枚举 */
export type CommentType = 'comment' | 'suggestion' | 'question' | 'approve' | 'reject';

/** Plan 列表项（轻量级） */
export interface PlanInfo {
  id: string;
  name: string;
  path: string;
  modified: string;       // ISO 8601
  created: string;        // ISO 8601（来自 stat.ctime）
  size: number;
  commentCount: number;
  project: string;        // 提取自内容，空串 = 未分组
}

/** 完整 Plan 数据 */
export interface Plan {
  id: string;
  name: string;
  path: string;
  content: string;
  modified: string;       // ISO 8601
  comments: Comment[];
}

/** 评论实体 */
export interface Comment {
  id: string;
  planId: string;
  lineNumber: number | null;
  lineContent: string;
  sectionTitle: string;
  selectedText: string;
  text: string;
  type: CommentType;
  status: string;
  createdAt: string;      // ISO 8601
}

/** 创建评论的请求数据 */
export interface CommentData {
  text: string;
  commentType: CommentType;
  sectionTitle: string;
  selectedText: string;
}
