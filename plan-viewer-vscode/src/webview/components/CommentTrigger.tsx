// ── 评论触发按钮组件 ────────────────────────────────────

interface CommentTriggerProps {
  sectionTitle: string;
  commentCount: number;
  onClick: (sectionTitle: string) => void;
}

export function CommentTrigger({ sectionTitle, commentCount, onClick }: CommentTriggerProps) {
  const hasComments = commentCount > 0;

  return (
    <button
      class={`comment-trigger ${hasComments ? 'has-comments' : ''}`}
      title={hasComments
        ? `${commentCount} comments`
        : 'Add comment'}
      onClick={(e) => {
        e.stopPropagation();
        onClick(sectionTitle);
      }}
    >
      {hasComments ? commentCount : '+'}
    </button>
  );
}
