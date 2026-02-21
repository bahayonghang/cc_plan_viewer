// ── 评论类型选择器 ──────────────────────────────────────

import type { CommentType } from '../../types';

interface CommentTypeSelectorProps {
  value: CommentType;
  onChange: (type: CommentType) => void;
}

const TYPES: Array<{ type: CommentType; emoji: string; label: string }> = [
  { type: 'comment', emoji: '💬', label: 'Comment' },
  { type: 'suggestion', emoji: '💡', label: 'Suggestion' },
  { type: 'question', emoji: '❓', label: 'Question' },
  { type: 'approve', emoji: '✅', label: 'Approve' },
  { type: 'reject', emoji: '❌', label: 'Reject' },
];

export function CommentTypeSelector({ value, onChange }: CommentTypeSelectorProps) {
  return (
    <div class="inline-form-types">
      {TYPES.map(({ type, emoji, label }) => (
        <button
          key={type}
          class={`type-btn ${value === type ? 'active' : ''}`}
          title={label}
          onClick={() => onChange(type)}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
