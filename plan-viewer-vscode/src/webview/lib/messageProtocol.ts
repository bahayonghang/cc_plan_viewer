// ── Webview ↔ Extension Host 消息协议 ─────────────────────

import type { Plan, Comment, CommentData, CommentType, PlanInfo } from '../../types';

// ── Extension → Webview ──────────────────────────────────

export interface LoadPlanMessage {
  type: 'loadPlan';
  plan: Plan;
}

export interface LoadArtifactMessage {
  type: 'loadArtifact';
  artifact: {
    name: string;
    path: string;
    content: string;
    changeId: string;
    artifactType: string;
  };
}

export interface PlanListMessage {
  type: 'planList';
  plans: PlanInfo[];
}

export interface CommentAddedMessage {
  type: 'commentAdded';
  comment: Comment;
}

export interface CommentDeletedMessage {
  type: 'commentDeleted';
  commentId: string;
}

export interface CommentUpdatedMessage {
  type: 'commentUpdated';
  comment: Comment;
}

export interface ConfigChangedMessage {
  type: 'configChanged';
  config: WebviewConfig;
}

export interface CommentsClearedMessage {
  type: 'commentsCleared';
}

export type ExtensionToWebviewMessage =
  | LoadPlanMessage
  | LoadArtifactMessage
  | PlanListMessage
  | CommentAddedMessage
  | CommentDeletedMessage
  | CommentUpdatedMessage
  | ConfigChangedMessage
  | CommentsClearedMessage;

// ── Webview → Extension ──────────────────────────────────

export interface AddCommentMessage {
  type: 'addComment';
  planId: string;
  commentData: CommentData;
}

export interface DeleteCommentMessage {
  type: 'deleteComment';
  planId: string;
  commentId: string;
}

export interface UpdateCommentMessage {
  type: 'updateComment';
  planId: string;
  commentId: string;
  text: string;
  commentType: CommentType;
}

export interface OpenPlanMessage {
  type: 'openPlan';
  planId: string;
}

export interface RequestPlanListMessage {
  type: 'requestPlanList';
}

export interface OpenInEditorMessage {
  type: 'openInEditor';
  planId: string;
}

export interface OpenArtifactMessage {
  type: 'openArtifact';
  artifactPath: string;
}

export interface ShowToastMessage {
  type: 'showToast';
  message: string;
}

export interface ClearCommentsMessage {
  type: 'clearComments';
  planId: string;
}

export type WebviewToExtensionMessage =
  | AddCommentMessage
  | DeleteCommentMessage
  | UpdateCommentMessage
  | OpenPlanMessage
  | RequestPlanListMessage
  | OpenInEditorMessage
  | OpenArtifactMessage
  | ShowToastMessage
  | ClearCommentsMessage;

// ── 配置 ────────────────────────────────────────────────

export interface WebviewConfig {
  fontSize: number;
  lineHeight: number;
  embedCommentsInMarkdown: boolean;
}
