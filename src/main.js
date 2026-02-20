// Plan Viewer - Main Entry Point
import './styles/main.css';
import { applyI18n, toggleLang } from './i18n.js';

// Import Tauri API (will be used in later phases)
let useTauri = false;
try {
  const { invoke } = await import('@tauri-apps/api/core');
  window.__tauriInvoke = invoke;  // Cache invoke reference for performance
  useTauri = true;
  console.log('🔌 Tauri API loaded');
} catch (e) {
  console.log('🌐 Running in browser mode');
}

// Global state
window.currentPlanId = null;
window.currentPlan = null;
window.commentFormContext = {};
window.useTauri = useTauri;
window.currentSource = 'windows';
window.wslInfo = { available: false, distributions: [] };
window.sshConfigs = [];
window.sshConnectionStatus = {};

// 全局暴露 i18n 函数
window.toggleLang = toggleLang;

// 初始化 i18n 静态文本
applyI18n();

// Import application logic
import { initApp } from './app.js';

// Initialize the application
initApp();
