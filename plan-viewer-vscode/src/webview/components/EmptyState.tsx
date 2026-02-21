// ── 空状态组件 ──────────────────────────────────────────

export function EmptyState() {
  return (
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
        style={{ width: '64px', height: '64px', opacity: 0.3 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <h3>Plan Viewer</h3>
      <p>Select a plan from the sidebar to start reviewing.</p>
    </div>
  );
}
