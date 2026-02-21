// ── 评论导航面板组件 ────────────────────────────────────

import { useState, useMemo } from 'preact/hooks';
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

  function handleDelete(commentId: string) {
    postMessage({
      type: 'deleteComment',
      planId,
      commentId,
    });
  }

  function handleNavigate(comment: Comment) {
    if (comment.sectionTitle) {
      onNavigateToSection(comment.sectionTitle);
    }
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
                <div
                  key={comment.id}
                  class="panel-comment-item"
                  onClick={() => handleNavigate(comment)}
                >
                  <span>{TYPE_EMOJI[comment.type] || '💬'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div class="panel-comment-text">{comment.text}</div>
                    <div class="panel-comment-meta">
                      {timeAgo(comment.createdAt)}
                    </div>
                  </div>
                  <button
                    class="panel-comment-delete"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(comment.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
