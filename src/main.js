// Plan Viewer - Main Entry Point
import './styles/main.css';

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

// Import application logic
import { initApp } from './app.js';

// Initialize the application
initApp();
