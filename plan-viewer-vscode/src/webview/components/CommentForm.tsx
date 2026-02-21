// ── 评论表单组件 ────────────────────────────────────────

import { useState, useRef, useEffect } from 'preact/hooks';
import type { CommentType } from '../../types';
import { CommentTypeSelector } from './CommentTypeSelector';
import { postMessage } from '../hooks/useVsCodeApi';

interface CommentFormProps {
  planId: string;
  sectionTitle: string;
  selectedText?: string;
  onCancel: () => void;
}

export function CommentForm({ planId, sectionTitle, selectedText, onCancel }: CommentFormProps) {
  const [text, setText] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('comment');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // 键盘快捷键
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    postMessage({
      type: 'addComment',
      planId,
      commentData: {
        text: trimmed,
        commentType,
        sectionTitle,
        selectedText: selectedText || '',
      },
    });

    setText('');
  }

  return (
    <div class="inline-comment-form">
      {selectedText && (
        <div class="inline-form-context">
          "{selectedText.length > 60
            ? selectedText.slice(0, 60) + '...'
            : selectedText}"
        </div>
      )}

      <textarea
        ref={textareaRef}
        class="inline-comment-textarea"
        placeholder="Write your comment... (Ctrl+Enter to submit, Esc to cancel)"
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        style={{ width: '100%', padding: '8px', border: '1px solid var(--border-primary)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', resize: 'vertical', minHeight: '60px' }}
      />

      <div class="inline-form-row">
        <CommentTypeSelector value={commentType} onChange={setCommentType} />
        <div class="inline-form-actions">
          <button class="toolbar-btn" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            class="toolbar-btn primary"
            onClick={handleSubmit}
            type="button"
            disabled={!text.trim()}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
