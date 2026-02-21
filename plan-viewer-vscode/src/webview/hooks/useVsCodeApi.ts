// ── useVsCodeApi Hook ────────────────────────────────────

import type { WebviewToExtensionMessage } from '../lib/messageProtocol';

/**
 * VSCode Webview API 类型
 */
interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
  getState<T>(): T | undefined;
  setState<T>(state: T): void;
}

/** 缓存的 API 实例 */
let cachedApi: VsCodeApi | undefined;

/**
 * 获取 VSCode Webview API
 *
 * 在开发模式下（非 Webview 环境）返回 mock API
 */
export function useVsCodeApi(): VsCodeApi {
  if (cachedApi) return cachedApi;

  // VSCode Webview 环境
  if (typeof acquireVsCodeApi === 'function') {
    cachedApi = acquireVsCodeApi() as VsCodeApi;
    return cachedApi;
  }

  // 开发模式 mock（Vite dev server）
  console.warn('[Plan Viewer] Running outside VSCode Webview, using mock API');
  cachedApi = {
    postMessage: (msg) => console.log('[mock postMessage]', msg),
    getState: () => undefined,
    setState: () => {},
  };
  return cachedApi;
}

/**
 * 发送消息到 Extension Host
 */
export function postMessage(message: WebviewToExtensionMessage): void {
  useVsCodeApi().postMessage(message);
}

// 声明全局 acquireVsCodeApi
declare function acquireVsCodeApi(): unknown;
