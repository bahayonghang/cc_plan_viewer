// ── Toast 通知组件 ──────────────────────────────────────

import { useState, useEffect, useCallback } from 'preact/hooks';

interface ToastMessage {
  text: string;
  id: number;
}

let toastId = 0;
let showToastFn: ((text: string) => void) | null = null;

/**
 * 显示 toast 通知（可从外部调用）
 */
export function showToast(text: string): void {
  showToastFn?.(text);
}

export function Toast() {
  const [message, setMessage] = useState<ToastMessage | null>(null);

  const show = useCallback((text: string) => {
    const id = ++toastId;
    setMessage({ text, id });

    setTimeout(() => {
      setMessage(prev => prev?.id === id ? null : prev);
    }, 3000);
  }, []);

  useEffect(() => {
    showToastFn = show;
    return () => { showToastFn = null; };
  }, [show]);

  return (
    <div class={`toast ${message ? 'visible' : ''}`}>
      {message?.text}
    </div>
  );
}
