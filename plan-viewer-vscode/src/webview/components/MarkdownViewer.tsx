// ── Markdown 渲染器组件 ──────────────────────────────────

import { useEffect, useRef, useMemo } from 'preact/hooks';
import { renderMarkdown, splitIntoSections } from '../lib/markdown';
import { MermaidBlock } from './MermaidBlock';
import { CommentCard } from './CommentCard';
import { CommentForm } from './CommentForm';
import { render } from 'preact';
import type { Comment } from '../../types';

interface MarkdownViewerProps {
  content: string;
  comments: Comment[];
  planId: string;
  commentFormTarget: string | null;
  selectedTextTarget: string | null;
  onOpenCommentForm: (sectionTitle: string) => void;
  onOpenSelectionComment: (selectedText: string) => void;
  onCloseCommentForm: () => void;
}

/**
 * Markdown 内容渲染器
 *
 * 功能:
 * - 渲染 Markdown（marked + highlight.js）
 * - 按 Section 分割并注入评论触发按钮
 * - Mermaid 图表懒渲染
 * - 内联评论卡片渲染
 * - 评论表单
 */
export function MarkdownViewer({
  content,
  comments,
  planId,
  commentFormTarget,
  selectedTextTarget,
  onOpenCommentForm,
  onCloseCommentForm,
}: MarkdownViewerProps) {
  const paneRef = useRef<HTMLDivElement>(null);

  // 渲染 Markdown HTML
  const html = useMemo(() => renderMarkdown(content), [content]);

  // Section 分割
  const sections = useMemo(() => splitIntoSections(html), [html]);

  // 按 section 分组评论
  const commentsBySection = useMemo(() => {
    const map: Record<string, Comment[]> = {};
    for (const c of comments) {
      if (!c.sectionTitle && !c.selectedText) continue;
      const key = c.sectionTitle || '';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
  }, [comments]);

  // 后处理: 将 Mermaid 容器替换为 Preact 组件
  useEffect(() => {
    if (!paneRef.current) return;

    const mermaidContainers = paneRef.current.querySelectorAll('.mermaid-container[data-mermaid]');
    for (const container of mermaidContainers) {
      const code = decodeURIComponent(container.getAttribute('data-mermaid') || '');
      if (code) {
        render(<MermaidBlock code={code} />, container);
      }
    }
  }, [html]);

  return (
    <div class="markdown-pane" ref={paneRef}>
      {sections.map((section, i) => {
        const sectionComments = commentsBySection[section.title] || [];
        const hasComments = sectionComments.length > 0;
        const isFormOpen = commentFormTarget === section.title;

        return (
          <div
            key={i}
            class={`md-section ${hasComments ? 'has-comments' : ''}`}
            data-section={section.title}
          >
            {section.title && (
              <button
                class={`comment-trigger ${hasComments ? 'has-comments' : ''}`}
                title={hasComments
                  ? `${sectionComments.length} comments`
                  : 'Add comment'}
                onClick={() => onOpenCommentForm(section.title)}
              >
                {hasComments ? sectionComments.length : '+'}
              </button>
            )}
            <div dangerouslySetInnerHTML={{ __html: section.html }} />

            {/* 内联评论卡片 */}
            {sectionComments.map(comment => (
              <CommentCard key={comment.id} comment={comment} planId={planId} />
            ))}

            {/* 评论表单 */}
            {isFormOpen && (
              <CommentForm
                planId={planId}
                sectionTitle={section.title}
                selectedText={selectedTextTarget || undefined}
                onCancel={onCloseCommentForm}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
