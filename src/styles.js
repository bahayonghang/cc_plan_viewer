// Plan Viewer - CSS 注入管理模块
// 提供分层样式注入：内置预设 → 全局自定义 CSS → 单 plan 内嵌 CSS

import { t, getCurrentLang } from './i18n.js';

// ── 内置显示预设 ────────────────────────────────────────────

const PRESETS = {
  default: {
    label: { zh: '默认', en: 'Default' },
    css: `
      .markdown-pane { max-width: unset; margin: unset; }
      .md-content { font-family: inherit; }
      .md-content p { text-align: unset; }
      .md-content blockquote { font-style: unset; }
      .md-section { border-left-style: solid; padding-left: 32px; }
      .comment-trigger { left: 4px; }
    `
  },
  compact: {
    label: { zh: '紧凑', en: 'Compact' },
    css: `
      .md-content h1 { font-size: 1.6rem; margin-bottom: 10px; padding-bottom: 8px; }
      .md-content h2 { font-size: 1.25rem; margin: 20px 0 8px; padding-bottom: 6px; }
      .md-content h3 { font-size: 1.05rem; margin: 16px 0 6px; }
      .md-content p { margin: 4px 0; line-height: 1.5; }
      .md-content ul, .md-content ol { margin: 4px 0; }
      .md-content li { margin: 2px 0; line-height: 1.4; }
      .md-content pre { margin: 8px 0; }
      .md-content blockquote { margin: 6px 0; padding: 6px 12px; }
      .md-content table { margin: 8px 0; }
      .md-content hr { margin: 16px 0; }
      .md-section { padding-left: 24px; }
      .markdown-pane { padding: 20px 32px 60px; }
    `
  },
  spacious: {
    label: { zh: '宽松', en: 'Spacious' },
    css: `
      .md-content h1 { font-size: 2.2rem; margin-bottom: 24px; padding-bottom: 16px; }
      .md-content h2 { font-size: 1.7rem; margin: 44px 0 16px; padding-bottom: 12px; }
      .md-content h3 { font-size: 1.3rem; margin: 32px 0 12px; }
      .md-content p { margin: 12px 0; line-height: 1.85; }
      .md-content li { margin: 6px 0; line-height: 1.75; }
      .md-content pre { margin: 20px 0; }
      .md-content blockquote { margin: 16px 0; padding: 12px 20px; }
      .md-content table { margin: 20px 0; }
      .md-content hr { margin: 32px 0; }
      .markdown-pane { padding: 48px 64px 100px; }
    `
  },
  academic: {
    label: { zh: '学术', en: 'Academic' },
    css: `
      .md-content { font-family: Georgia, 'Times New Roman', 'Noto Serif SC', serif; }
      .md-content h1, .md-content h2, .md-content h3 {
        font-family: Georgia, 'Times New Roman', 'Noto Serif SC', serif;
      }
      .md-content p { line-height: 1.8; text-align: justify; }
      .md-content li { line-height: 1.7; }
      .md-content blockquote { font-style: italic; }
      .markdown-pane { max-width: 800px; margin: 0 auto; padding: 40px 48px 80px; }
    `
  },
  minimal: {
    label: { zh: '极简', en: 'Minimal' },
    css: `
      .md-content h1 { border-bottom: none; padding-bottom: 0; }
      .md-content h2 { border-bottom: none; padding-bottom: 0; }
      .md-content pre { border: none; border-radius: 4px; }
      .md-content blockquote {
        border-left: 2px solid var(--border-primary);
        background: none;
      }
      .md-content table { border: none; }
      .md-content th, .md-content td { border-color: var(--border-primary); }
      .md-section { border-left: none !important; padding-left: 0; }
      .md-section:hover { border-left-color: transparent !important; }
      .comment-trigger { left: -28px; }
    `
  },
  focus: {
    label: { zh: '专注', en: 'Focus' },
    css: `
      .markdown-pane { max-width: 720px; margin: 0 auto; padding: 40px 48px 100px; }
      .md-content { font-size: 1rem; }
      .md-content p { line-height: 1.9; }
      .md-section { border-left: none !important; padding-left: 0; }
      .md-section:hover { border-left-color: transparent !important; }
      .comment-trigger { display: none !important; }
      .section-comments { display: none !important; }
      .inline-comment-card { display: none !important; }
    `
  }
};

// ── 内部状态 ────────────────────────────────────────────────

let currentPreset = 'default';
let styleElements = {};

// ── CSS 安全过滤 ────────────────────────────────────────────

const MAX_CSS_LENGTH = 50000;

/**
 * 过滤危险 CSS 属性和值，防止 XSS
 * @param {string} raw - 原始 CSS 字符串
 * @returns {string} 安全的 CSS 字符串
 */
function sanitizeCSS(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let css = raw
    .replace(/@import\b[^;]*;/gi, '/* blocked: @import */')
    .replace(/@charset\b[^;]*;/gi, '/* blocked: @charset */')
    .replace(/url\s*\([^)]*\)/gi, '/* blocked: url() */')
    .replace(/expression\s*\([^)]*\)/gi, '/* blocked: expression() */')
    .replace(/-moz-binding\s*:[^;]*;/gi, '/* blocked: -moz-binding */');

  if (css.length > MAX_CSS_LENGTH) {
    css = css.slice(0, MAX_CSS_LENGTH) + '\n/* truncated: exceeded 50KB limit */';
  }

  return css;
}

// ── Plan 内嵌 CSS 提取 ──────────────────────────────────────

/**
 * 从 plan markdown 内容中提取 HTML 注释格式的样式块
 * 格式: <!-- plan-style\n CSS内容 \n-->
 * @param {string} content - plan markdown 内容
 * @returns {string} 提取的 CSS（可能为空字符串）
 */
function extractPlanCSS(content) {
  if (!content) return '';
  const match = content.match(/<!--\s*plan-style\s*\n([\s\S]*?)-->/);
  return match ? match[1].trim() : '';
}

// ── 样式注入辅助 ────────────────────────────────────────────

/**
 * 创建或获取指定 id 的 <style> 元素
 */
function getOrCreateStyleElement(id) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}

/**
 * 安全注入 CSS 到指定 <style> 元素（使用 textContent 防止 HTML 注入）
 */
function injectCSS(elementId, css) {
  const el = getOrCreateStyleElement(elementId);
  el.textContent = css;
}

// ── 导出函数 ────────────────────────────────────────────────

/**
 * 初始化样式注入系统
 * 创建 3 个 <style> 元素，加载已保存预设 + 全局自定义 CSS
 */
export async function initStyles() {
  // 创建三层 <style> 元素（按优先级递增）
  styleElements.preset = getOrCreateStyleElement('preset-css');
  styleElements.globalCustom = getOrCreateStyleElement('global-custom-css');
  styleElements.plan = getOrCreateStyleElement('plan-css');

  // 恢复已保存的预设
  const saved = localStorage.getItem('displayPreset');
  if (saved && PRESETS[saved]) {
    currentPreset = saved;
  }
  injectCSS('preset-css', PRESETS[currentPreset].css);

  // 填充预设选择器
  updatePresetSelector();

  // 加载全局自定义 CSS
  await loadGlobalCustomCSS();
}

/**
 * 切换显示预设
 * @param {string} name - 预设 ID
 */
export function setPreset(name) {
  if (!PRESETS[name]) return;
  currentPreset = name;
  localStorage.setItem('displayPreset', name);
  injectCSS('preset-css', PRESETS[name].css);

  // 同步下拉选择器
  const selector = document.getElementById('presetSelector');
  if (selector) selector.value = name;
}

/**
 * 获取当前预设名
 * @returns {string} 当前预设 ID
 */
export function getPreset() {
  return currentPreset;
}

/**
 * 获取预设列表（供 UI 渲染）
 * @returns {Array<{id: string, label: string}>}
 */
export function getPresetList() {
  const lang = getCurrentLang();
  return Object.entries(PRESETS).map(([id, preset]) => ({
    id,
    label: preset.label[lang] || preset.label.en
  }));
}

/**
 * 从 plan markdown 提取并注入内嵌 CSS
 * @param {string} content - plan markdown 内容
 */
export function applyPlanStyles(content) {
  const css = extractPlanCSS(content);
  injectCSS('plan-css', css ? sanitizeCSS(css) : '');
}

/**
 * 清除 plan 内嵌 CSS（切换 plan 时调用）
 */
export function clearPlanStyles() {
  injectCSS('plan-css', '');
}

/**
 * 通过 Tauri 命令加载全局自定义 CSS (~/.claude/plan-viewer/custom.css)
 * 浏览器模式下跳过
 */
export async function loadGlobalCustomCSS() {
  if (!window.useTauri) return;

  try {
    const css = await window.__tauriInvoke('get_custom_css');
    if (css) {
      injectCSS('global-custom-css', sanitizeCSS(css));
    }
  } catch (e) {
    console.warn('自定义 CSS 加载失败:', e);
  }
}

/**
 * 主题切换时的回调钩子
 * 预设使用 CSS 变量，大部分情况无需额外处理
 * @param {string} _theme - 当前主题 ('dark' | 'light')
 */
export function onThemeChange(_theme) {
  // 预设均使用 var(--*) CSS 变量，主题切换时自动适应
  // 预留扩展点：如果未来有主题相关的预设逻辑
}

/**
 * 语言切换时更新预设选择器下拉菜单文本
 */
export function updatePresetSelector() {
  const selector = document.getElementById('presetSelector');
  if (!selector) return;

  const lang = getCurrentLang();
  selector.innerHTML = '';

  for (const [id, preset] of Object.entries(PRESETS)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = preset.label[lang] || preset.label.en;
    if (id === currentPreset) option.selected = true;
    selector.appendChild(option);
  }
}

// ── 自定义 CSS 编辑器 ──────────────────────────────────────

/**
 * 获取当前全局自定义 CSS 内容
 * @returns {string} 当前自定义 CSS 文本
 */
export function getGlobalCustomCSS() {
  const el = document.getElementById('global-custom-css');
  return el ? el.textContent : '';
}

/**
 * 保存并即时应用自定义 CSS
 * @param {string} css - 自定义 CSS 内容
 */
export async function saveGlobalCustomCSS(css) {
  // 即时注入预览
  injectCSS('global-custom-css', sanitizeCSS(css));

  // 通过 Tauri 持久化到文件
  if (window.useTauri) {
    try {
      await window.__tauriInvoke('save_custom_css', { css });
    } catch (e) {
      console.warn('保存自定义 CSS 失败:', e);
    }
  }
}

/**
 * 打开 CSS 编辑器模态框
 */
export function openCssEditor() {
  const modal = document.getElementById('cssEditorModal');
  const textarea = document.getElementById('cssEditorText');
  if (!modal || !textarea) return;

  // 加载当前自定义 CSS 内容到编辑器
  textarea.value = getGlobalCustomCSS();
  modal.style.display = 'flex';
  textarea.focus();
}

/**
 * 关闭 CSS 编辑器模态框
 * @param {Event} [event] - 点击事件（用于判断是否点击了 overlay）
 */
export function closeCssEditor(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('cssEditorModal');
  if (modal) modal.style.display = 'none';
}
