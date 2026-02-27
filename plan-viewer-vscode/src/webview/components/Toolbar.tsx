// ── 工具栏组件 ──────────────────────────────────────────

import { postMessage } from '../hooks/useVsCodeApi';

interface ToolbarProps {
  planName: string;
  commentCount: number;
  onTogglePanel: () => void;
  onClearComments?: () => void;
  panelOpen: boolean;
  artifactProps?: {
    isArtifact: boolean;
    changeId: string;
    path: string;
  };
}

export function Toolbar({ planName, commentCount, onTogglePanel, onClearComments, panelOpen, artifactProps }: ToolbarProps) {
  const isArtifact = artifactProps?.isArtifact ?? false;

  // Artifact 模式显示更清晰的面包屑路径
  const displayTitle = isArtifact && artifactProps?.changeId
    ? `${artifactProps.changeId} / ${planName}`
    : planName;

  return (
    <div class="toolbar">
      <span class="toolbar-title">{displayTitle}</span>
      {!isArtifact && (
        <span class="toolbar-meta">
          {commentCount > 0 && `💬 ${commentCount}`}
        </span>
      )}
      <span class="toolbar-spacer" />
      {!isArtifact && commentCount > 0 && onClearComments && (
        <button
          class="toolbar-btn"
          title="Clear All Comments"
          onClick={onClearComments}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Clear
        </button>
      )}
      <button
        class="toolbar-btn"
        title={isArtifact ? "Open Artifact in Editor" : "Open Plan in Editor"}
        onClick={() => {
          if (isArtifact && artifactProps?.path) {
            postMessage({ type: 'openArtifact', artifactPath: artifactProps.path });
          } else {
            const planId = planName.replace(/\.md$/, '');
            postMessage({ type: 'openInEditor', planId });
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Editor
      </button>
      {!isArtifact && (
        <button
          class={`toolbar-btn ${panelOpen ? 'primary' : ''}`}
          title="Toggle Comment Panel"
          onClick={onTogglePanel}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
          </svg>
          {commentCount > 0 ? commentCount : 'Comments'}
        </button>
      )}
    </div>
  );
}
