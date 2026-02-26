// ── 评论导航面板组件 ────────────────────────────────────

import { useState, useMemo, useRef, useEffect } from 'preact/hooks';
import type { Comment, CommentType } from '../../types';
import { timeAgo } from '../lib/timeUtils';
import { postMessage } from '../hooks/useVsCodeApi';

interface CommentPanelProps {
  comments: Comment[];
  planId: string;
  onNavigateToSection: (sectionTitle: string) => void;
}

const TYPE_EMOJI: Record<CommentType, string> = {
  comment: '💬',
  suggestion: '💡',
  question: '❓',
  approve: '✅',
  reject: '❌',
};

interface EditState {
  commentId: string;
  text: string;
  type: CommentType;
}

function PanelCommentItem({
  comment,
  planId,
  onNavigate,
}: {
  comment: Comment;
  planId: string;
  onNavigate: () => void;
}) {
  const [edit, setEdit] = useState<EditState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (edit) {
      textareaRef.current?.focus();
    }
  }, [edit]);

  function handleEditStart(e: MouseEvent) {
    e.stopPropagation();
    setEdit({ commentId: comment.id, text: comment.text, type: comment.type });
  }

  function handleEditCancel(e: MouseEvent) {
    e.stopPropagation();
    setEdit(null);
  }

  function handleEditSave(e: MouseEvent) {
    e.stopPropagation();
    if (!edit || !edit.text.trim()) return;
    postMessage({
      type: 'updateComment',
      planId,
      commentId: comment.id,
      text: edit.text.trim(),
      commentType: edit.type,
    });
    setEdit(null);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (edit && edit.text.trim()) {
        postMessage({
          type: 'updateComment',
          planId,
          commentId: comment.id,
          text: edit.text.trim(),
          commentType: edit.type,
        });
        setEdit(null);
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setEdit(null);
    }
  }

  function handleDelete(e: MouseEvent) {
    e.stopPropagation();
    postMessage({ type: 'deleteComment', planId, commentId: comment.id });
  }

  if (edit) {
    return (
      <div class="panel-comment-item editing" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span>{TYPE_EMOJI[comment.type] || '💬'}</span>
          <span class="panel-comment-meta">{timeAgo(comment.createdAt)}</span>
        </div>
        <textarea
          ref={textareaRef}
          class="inline-comment-textarea"
          value={edit.text}
          onInput={(e) => setEdit(prev => prev ? { ...prev, text: (e.target as HTMLTextAreaElement).value } : null)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-primary)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', resize: 'vertical', minHeight: '52px', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
          <button class="toolbar-btn" onClick={handleEditCancel} type="button">Cancel</button>
          <button class="toolbar-btn primary" onClick={handleEditSave} type="button" disabled={!edit.text.trim()}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div class="panel-comment-item" onClick={onNavigate}>
      <span>{TYPE_EMOJI[comment.type] || '💬'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div class="panel-comment-text">{comment.text}</div>
        <div class="panel-comment-meta">{timeAgo(comment.createdAt)}</div>
      </div>
      <button
        class="panel-comment-delete"
        title="Edit"
        onClick={handleEditStart}
        style={{ marginRight: '2px' }}
      >
        ✎
      </button>
      <button
        class="panel-comment-delete"
        title="Delete"
        onClick={handleDelete}
      >
        ×
      </button>
    </div>
  );
}

export function CommentPanel({ comments, planId, onNavigateToSection }: CommentPanelProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // 按 section 分组
  const grouped = useMemo(() => {
    const map: Record<string, Comment[]> = {};
    for (const c of comments) {
      const key = c.sectionTitle || '(Global)';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
  }, [comments]);

  const sectionNames = Object.keys(grouped);

  function toggleSection(name: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  if (comments.length === 0) {
    return (
      <div class="panel-empty">
        No comments yet.<br />
        Click "+" on a section to add one.
      </div>
    );
  }

  return (
    <div>
      {sectionNames.map(name => {
        const sectionComments = grouped[name];
        const isCollapsed = collapsedSections.has(name);

        return (
          <div key={name} class={`panel-section ${isCollapsed ? 'collapsed' : ''}`}>
            <div class="panel-section-header" onClick={() => toggleSection(name)}>
              <span class="panel-section-chevron">▼</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </span>
              <span class="panel-section-count">{sectionComments.length}</span>
            </div>

            <div class="panel-section-body">
              {sectionComments.map(comment => (
                <PanelCommentItem
                  key={comment.id}
                  comment={comment}
                  planId={planId}
                  onNavigate={() => {
                    if (comment.sectionTitle) onNavigateToSection(comment.sectionTitle);
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
