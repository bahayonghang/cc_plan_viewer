// ── 评论卡片组件 ────────────────────────────────────────

import type { Comment, CommentType } from '../../types';
import { timeAgo } from '../lib/timeUtils';
import { postMessage } from '../hooks/useVsCodeApi';

interface CommentCardProps {
  comment: Comment;
  planId: string;
}

const TYPE_EMOJI: Record<CommentType, string> = {
  comment: '💬',
  suggestion: '💡',
  question: '❓',
  approve: '✅',
  reject: '❌',
};

export function CommentCard({ comment, planId }: CommentCardProps) {
  function handleDelete() {
    postMessage({
      type: 'deleteComment',
      planId,
      commentId: comment.id,
    });
  }

  return (
    <div class={`inline-comment-card ${comment.type}`}>
      <div class="inline-comment-text">
        <span style={{ marginRight: '4px' }}>
          {TYPE_EMOJI[comment.type] || '💬'}
        </span>
        {comment.text}
        <div class="inline-comment-meta">
          {comment.sectionTitle && (
            <span>re: {comment.sectionTitle}</span>
          )}
          {comment.selectedText && (
            <span>on: "{comment.selectedText.length > 40
              ? comment.selectedText.slice(0, 40) + '...'
              : comment.selectedText}"</span>
          )}
          {' · '}
          {timeAgo(comment.createdAt)}
        </div>
      </div>
      <div class="inline-comment-actions">
        <button title="Delete comment" onClick={handleDelete}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            width="14" height="14">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
