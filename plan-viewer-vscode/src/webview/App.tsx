// ── 根组件 ──────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'preact/hooks';
import type { Plan } from '../types';
import type { ExtensionToWebviewMessage } from './lib/messageProtocol';
import { EmptyState } from './components/EmptyState';
import { Toolbar } from './components/Toolbar';
import { MarkdownViewer } from './components/MarkdownViewer';
import { SelectionTooltip } from './components/SelectionTooltip';
import { CommentPanel } from './components/CommentPanel';
import { Toast } from './components/Toast';

// Extension Host 将初始 Plan 注入 window.__INITIAL_PLAN__ 以避免竞争条件
declare global {
  interface Window { __INITIAL_PLAN__?: Plan; }
}

interface AppState {
  plan: Plan | null;
  artifact: {
    name: string;
    path: string;
    content: string;
    changeId: string;
    artifactType: string;
  } | null;
  panelOpen: boolean;
  commentFormTarget: string | null;   // section title for active comment form
  selectedTextTarget: string | null;  // selected text for text-selection comment
}

export function App() {
  const [state, setState] = useState<AppState>({
    plan: window.__INITIAL_PLAN__ ?? null,
    panelOpen: false,
    commentFormTarget: null,
    selectedTextTarget: null,
  });

  // 接收 Extension Host 消息
  useEffect(() => {
    function handleMessage(event: MessageEvent<ExtensionToWebviewMessage>) {
      const msg = event.data;

      switch (msg.type) {
        case 'loadPlan':
          setState(prev => ({
            ...prev,
            plan: msg.plan,
            artifact: null,
            commentFormTarget: null,
            selectedTextTarget: null,
          }));
          break;

        case 'loadArtifact':
          // @ts-expect-error - artifact type is in updated message protocol
          setState(prev => ({
            ...prev,
            plan: null,
            artifact: msg.artifact,
            panelOpen: false, // 强制关闭评论面板
            commentFormTarget: null,
            selectedTextTarget: null,
          }));
          break;

        case 'commentAdded':
          setState(prev => {
            if (!prev.plan) return prev;
            return {
              ...prev,
              plan: {
                ...prev.plan,
                comments: [...prev.plan.comments, msg.comment],
              },
              commentFormTarget: null,
              selectedTextTarget: null,
            };
          });
          break;

        case 'commentDeleted':
          setState(prev => {
            if (!prev.plan) return prev;
            return {
              ...prev,
              plan: {
                ...prev.plan,
                comments: prev.plan.comments.filter(c => c.id !== msg.commentId),
              },
            };
          });
          break;

        case 'commentUpdated':
          setState(prev => {
            if (!prev.plan) return prev;
            return {
              ...prev,
              plan: {
                ...prev.plan,
                comments: prev.plan.comments.map(c =>
                  c.id === msg.comment.id ? msg.comment : c
                ),
              },
            };
          });
          break;

        case 'configChanged':
          document.documentElement.style.setProperty('--user-font-size', `${msg.config.fontSize}px`);
          document.documentElement.style.setProperty('--user-line-height', `${msg.config.lineHeight}`);
          break;
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTogglePanel = useCallback(() => {
    setState(prev => ({ ...prev, panelOpen: !prev.panelOpen }));
  }, []);

  const handleOpenCommentForm = useCallback((sectionTitle: string) => {
    setState(prev => ({
      ...prev,
      commentFormTarget: sectionTitle,
      selectedTextTarget: null,
    }));
  }, []);

  const handleCloseCommentForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      commentFormTarget: null,
      selectedTextTarget: null,
    }));
  }, []);

  const handleSelectionComment = useCallback((selectedText: string) => {
    // 找到选中文本所在的 section
    setState(prev => ({
      ...prev,
      commentFormTarget: prev.commentFormTarget || '',
      selectedTextTarget: selectedText,
    }));
  }, []);

  // 空状态
  if (!state.plan && !state.artifact) {
    return (
      <div class="app">
        <EmptyState />
      </div>
    );
  }

  const { plan, artifact, panelOpen, commentFormTarget, selectedTextTarget } = state;

  // Artifact 渲染模式
  if (artifact) {
    return (
      <div class="app">
        <Toolbar
          planName={artifact.name}
          commentCount={0}
          onTogglePanel={handleTogglePanel}
          panelOpen={false}
          artifactProps={{
            isArtifact: true,
            changeId: artifact.changeId,
            path: artifact.path
          }}
        />

        <div class="split-view">
          <MarkdownViewer
            content={artifact.content}
            comments={[]}
            planId={artifact.path}
            commentFormTarget={null}
            selectedTextTarget={null}
            onOpenCommentForm={() => { }}
            onOpenSelectionComment={() => { }}
            onCloseCommentForm={() => { }}
          // @ts-expect-error - we can add a readonly prop to MarkdownViewer if needed, 
          // but empty comments/handlers basically make it readonly
          />
        </div>
        <Toast />
      </div>
    );
  }

  // Plan 渲染模式
  if (!plan) return null;

  return (
    <div class="app">
      <Toolbar
        planName={plan.name}
        commentCount={plan.comments.length}
        onTogglePanel={handleTogglePanel}
        panelOpen={panelOpen}
      />

      <div class="split-view">
        <MarkdownViewer
          content={plan.content}
          comments={plan.comments}
          planId={plan.id}
          commentFormTarget={commentFormTarget}
          selectedTextTarget={selectedTextTarget}
          onOpenCommentForm={handleOpenCommentForm}
          onOpenSelectionComment={handleSelectionComment}
          onCloseCommentForm={handleCloseCommentForm}
        />

        {/* 评论导航面板 */}
        <div class={`comment-panel ${panelOpen ? 'open' : ''}`}>
          <div class="comment-panel-inner">
            <CommentPanel
              comments={plan.comments}
              planId={plan.id}
              onNavigateToSection={(sectionTitle) => {
                // 滚动到对应 section
                const el = document.querySelector(`[data-section="${sectionTitle}"]`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          </div>
        </div>
      </div>

      <SelectionTooltip onComment={handleSelectionComment} />
      <Toast />
    </div>
  );
}
