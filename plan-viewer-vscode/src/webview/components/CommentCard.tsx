// ── 评论卡片组件 ────────────────────────────────────────

import { useState, useRef, useEffect } from 'preact/hooks';
import type { Comment, CommentType } from '../../types';
import { timeAgo } from '../lib/timeUtils';
import { postMessage } from '../hooks/useVsCodeApi';
import { CommentTypeSelector } from './CommentTypeSelector';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [editType, setEditType] = useState<CommentType>(comment.type);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 进入编辑模式时自动聚焦
  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  function handleDelete() {
    postMessage({
      type: 'deleteComment',
      planId,
      commentId: comment.id,
    });
  }

  function handleEditStart() {
    setEditText(comment.text);
    setEditType(comment.type);
    setIsEditing(true);
  }

  function handleEditCancel() {
    setIsEditing(false);
  }

  function handleEditSave() {
    const trimmed = editText.trim();
    if (!trimmed) return;

    postMessage({
      type: 'updateComment',
      planId,
      commentId: comment.id,
      text: trimmed,
      commentType: editType,
    });

    setIsEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleEditSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  }

  if (isEditing) {
    return (
      <div class={`inline-comment-card ${comment.type} editing`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <textarea
          ref={textareaRef}
          class="inline-comment-textarea"
          value={editText}
          onInput={(e) => setEditText((e.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--border-primary)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', resize: 'vertical', minHeight: '60px', boxSizing: 'border-box' }}
        />
        <div class="inline-form-row" style={{ marginTop: '6px' }}>
          <CommentTypeSelector value={editType} onChange={setEditType} />
          <div class="inline-form-actions">
            <button class="toolbar-btn" onClick={handleEditCancel} type="button">
              Cancel
            </button>
            <button
              class="toolbar-btn primary"
              onClick={handleEditSave}
              type="button"
              disabled={!editText.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
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
        <button title="Edit comment" onClick={handleEditStart}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            width="14" height="14">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
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
