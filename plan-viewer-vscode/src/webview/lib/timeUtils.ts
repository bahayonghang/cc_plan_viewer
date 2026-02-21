// ── 时间工具函数 ────────────────────────────────────────
// 移植自 app.js:151-159

/**
 * 相对时间格式化
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr);
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * 格式化时间戳为可读字符串
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}
