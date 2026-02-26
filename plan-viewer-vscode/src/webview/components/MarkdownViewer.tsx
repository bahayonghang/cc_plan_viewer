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

/** 悬浮表单的位置信息 */
interface FloatingPosition {
  top: number;
  left: number;
  width: number;
}

/**
 * Markdown 内容渲染器
 *
 * 功能:
 * - 渲染 Markdown（marked + highlight.js）
 * - 按 Section 分割并注入评论触发按钮
 * - Mermaid 图表懒渲染
 * - 内联评论卡片渲染
 * - 悬浮式评论表单（浮在内容上方）
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

  // 使用 useRef 记录最后点击/触发的位置坐标，避免 re-render 导致丢失
  const lastTargetRect = useRef<DOMRect | null>(null);

  // 渲染 Markdown HTML
  const html = useMemo(() => renderMarkdown(content), [content]);

  // Section 分割
  const sections = useMemo(() => splitIntoSections(html), [html]);

  // Click-outside listener to close form
  useEffect(() => {
    if (commentFormTarget === null) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // If clicking inside the form or its triggers, do not close
      if (
        target.closest('.floating-comment-form') ||
        target.closest('.comment-trigger') ||
        target.closest('.selection-tooltip')
      ) {
        return;
      }
      onCloseCommentForm();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commentFormTarget, onCloseCommentForm]);

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

  // 在评论表单关闭时清除位置记忆
  useEffect(() => {
    if (commentFormTarget === null) {
      lastTargetRect.current = null;
    }
  }, [commentFormTarget]);

  /** 处理点击段落的 `+` 评论按钮 */
  function handleTriggerClick(e: MouseEvent, sectionTitle: string) {
    const trigger = (e.currentTarget || e.target) as HTMLElement;
    const button = trigger.closest('.comment-trigger');
    if (button) {
      lastTargetRect.current = button.getBoundingClientRect();
    }
    onOpenCommentForm(sectionTitle);
  }

  /** 获取最终悬浮窗口的位置 */
  const floatingPos = useMemo<FloatingPosition | null>(() => {
    if (commentFormTarget === null) return null;
    const pane = paneRef.current;
    if (!pane) return null;

    const paneRect = pane.getBoundingClientRect();

    // 1. 如果有文本选区，优先使用选区位置
    if (selectedTextTarget) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rangeRect = range.getBoundingClientRect();
        // 更新最后记忆位置，防止选区在输入时丢失
        lastTargetRect.current = rangeRect;

        return {
          top: rangeRect.bottom - paneRect.top + pane.scrollTop + 12,
          left: 32,
          width: paneRect.width - 64,
        };
      }
    }

    // 2. 如果之前记录了点击元素的位置（比如按了 + 按钮）
    if (lastTargetRect.current) {
      const rect = lastTargetRect.current;
      return {
        top: rect.bottom - paneRect.top + pane.scrollTop + 8,
        left: 32,
        width: paneRect.width - 64,
      };
    }

    // 3. Fallback 回退方案：找到对应的段落元素
    const sectionEl = pane.querySelector(`[data-section="${commentFormTarget.replace(/"/g, '\\"')}"]`);
    if (sectionEl) {
      const sectionRect = sectionEl.getBoundingClientRect();
      return {
        top: sectionRect.top - paneRect.top + pane.scrollTop + 42,
        left: 32,
        width: paneRect.width - 64,
      };
    }

    // 4. 极端 Fallback：默认居中顶部
    return {
      top: pane.scrollTop + 100,
      left: 32,
      width: paneRect.width - 64,
    };
  }, [commentFormTarget, selectedTextTarget]);

  const isFormOpen = commentFormTarget !== null;

  return (
    <div class="markdown-pane" ref={paneRef}>
      {sections.map((section, i) => {
        const sectionComments = commentsBySection[section.title] || [];
        const hasComments = sectionComments.length > 0;

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
                onClick={(e) => handleTriggerClick(e as unknown as MouseEvent, section.title)}
              >
                {hasComments ? sectionComments.length : '+'}
              </button>
            )}
            <div dangerouslySetInnerHTML={{ __html: section.html }} />

            {/* 内联评论卡片 */}
            {sectionComments.map(comment => (
              <CommentCard key={comment.id} comment={comment} planId={planId} />
            ))}
          </div>
        );
      })}

      {/* 悬浮式评论表单（浮在内容上方） */}
      {isFormOpen && (
        <>
          <div
            class="floating-comment-form"
            style={floatingPos ? {
              top: `${floatingPos.top}px`,
              left: `${floatingPos.left}px`,
              width: `${floatingPos.width}px`,
            } : undefined}
          >
            <CommentForm
              planId={planId}
              sectionTitle={commentFormTarget || ''}
              selectedText={selectedTextTarget || undefined}
              onCancel={onCloseCommentForm}
            />
          </div>
        </>
      )}
    </div>
  );
}
