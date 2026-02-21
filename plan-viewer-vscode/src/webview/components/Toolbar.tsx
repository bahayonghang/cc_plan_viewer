// ── 工具栏组件 ──────────────────────────────────────────

import { postMessage } from '../hooks/useVsCodeApi';

interface ToolbarProps {
  planName: string;
  commentCount: number;
  onTogglePanel: () => void;
  panelOpen: boolean;
}

export function Toolbar({ planName, commentCount, onTogglePanel, panelOpen }: ToolbarProps) {
  return (
    <div class="toolbar">
      <span class="toolbar-title">{planName}</span>
      <span class="toolbar-meta">
        {commentCount > 0 && `💬 ${commentCount}`}
      </span>
      <span class="toolbar-spacer" />
      <button
        class="toolbar-btn"
        title="Open in Editor"
        onClick={() => {
          const planId = planName.replace(/\.md$/, '');
          postMessage({ type: 'openInEditor', planId });
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          width="14" height="14">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Editor
      </button>
      <button
        class={`toolbar-btn ${panelOpen ? 'primary' : ''}`}
        title="Toggle Comment Panel"
        onClick={onTogglePanel}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          width="14" height="14">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
        </svg>
        {commentCount > 0 ? commentCount : 'Comments'}
      </button>
    </div>
  );
}
