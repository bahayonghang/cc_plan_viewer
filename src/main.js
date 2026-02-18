// Plan Viewer - Main Entry Point
import './styles/main.css';

// Import Tauri API (will be used in later phases)
let useTauri = false;
try {
  const { invoke } = await import('@tauri-apps/api/core');
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

// Import application logic
import { initApp } from './app.js';

// Initialize the application
initApp();
