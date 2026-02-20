// Plan Viewer - Application Logic
// Supports both Tauri (desktop) and browser modes

import { t, getCurrentLang, toggleLang, applyI18n, onLangChange } from './i18n.js';
import { initStyles, applyPlanStyles, clearPlanStyles, setPreset,
         getPreset, getPresetList, onThemeChange, updatePresetSelector,
         openCssEditor, closeCssEditor, saveGlobalCustomCSS, getGlobalCustomCSS } from './styles.js';

// 平台检测
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

// Theme configuration
const THEME_CONFIG = {
  dark: {
    hljsUrl: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css',
    mermaid: { bg: '#21262d', fg: '#e6edf3', line: '#6e7681', accent: '#58a6ff', surface: '#161b22', border: '#30363d' }
  },
  light: {
    hljsUrl: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css',
    mermaid: { bg: '#f0f2f5', fg: '#1f2328', line: '#8c959f', accent: '#0969da', surface: '#f6f8fa', border: '#d0d7de' }
  }
};

// API abstraction layer - supports both Tauri and HTTP
async function api(path, options = {}) {
  if (window.useTauri) {
    // Tauri mode - use cached invoke reference
    const invoke = window.__tauriInvoke;
    const source = window.currentSource === 'windows' ? null : window.currentSource;

    if (path === '/plans' && options.method !== 'POST') {
      return await invoke('get_plans', { source });
    }

    if (path === '/custom-css' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      return await invoke('save_custom_css', { css: body.css });
    }

    if (path === '/custom-css') {
      return await invoke('get_custom_css');
    }

    if (path.startsWith('/plans/') && !path.endsWith('/comments') && options.method !== 'POST') {
      const planId = path.split('/')[2];
      return await invoke('get_plan_by_id', { planId, source });
    }

    if (path.endsWith('/comments') && options.method === 'POST') {
      const planId = path.split('/')[2];
      const body = JSON.parse(options.body);
      return await invoke('add_comment_command', {
        planId,
        commentData: {
          text: body.text,
          commentType: body.type || 'comment',
          sectionTitle: body.sectionTitle || '',
          selectedText: body.selectedText || ''
        },
        source
      });
    }

    if (path.includes('/comments/') && path.endsWith('/delete') && options.method === 'POST') {
      const commentId = path.split('/')[2];
      const body = JSON.parse(options.body);
      return await invoke('delete_comment_command', {
        planId: body.planId,
        commentId,
        source
      });
    }
  }
  
  // Browser mode - use fetch
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return res.json();
}

// Get current theme
function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

// Toggle theme
function toggleTheme() {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
}

// Apply theme
function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  // Toggle icons
  const sunIcon = document.getElementById('themeIconSun');
  const moonIcon = document.getElementById('themeIconMoon');
  if (sunIcon) sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
  if (moonIcon) moonIcon.style.display = theme === 'light' ? 'block' : 'none';
  
  // Swap highlight.js theme
  const hljsLink = document.getElementById('hljs-theme');
  if (hljsLink) {
    hljsLink.href = THEME_CONFIG[theme].hljsUrl;
  }

  // 通知样式模块主题变更
  onThemeChange(theme);
}

// Utility functions
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return t('time.justNow');
  if (diff < 3600) return Math.floor(diff / 60) + ' ' + t('time.minutesAgo');
  if (diff < 86400) return Math.floor(diff / 3600) + ' ' + t('time.hoursAgo');
  return Math.floor(diff / 86400) + ' ' + t('time.daysAgo');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }
}

// Source tabs for Windows/WSL/SSH integration
function renderSourceTabs() {
  // 隐藏旧的 select 切换器
  const oldSwitcher = document.getElementById('sourceSwitcher');
  if (oldSwitcher) oldSwitcher.style.display = 'none';

  const el = document.getElementById('sourceTabs');
  if (!el || !window.useTauri) {
    if (el) el.style.display = 'none';
    return;
  }

  // 构建 tab 列表
  const tabs = [
    { value: 'windows', label: '🪟 Windows', icon: '🪟' }
  ];

  // WSL tabs
  if (window.wslInfo?.available) {
    for (const d of window.wslInfo.distributions) {
      tabs.push({ value: `wsl:${d}`, label: `🐧 ${d}`, icon: '🐧' });
    }
  }

  // SSH tabs
  for (const cfg of (window.sshConfigs || [])) {
    const status = window.sshConnectionStatus[cfg.id];
    const statusClass = status === 'connected' ? 'connected' : (status === 'connecting' ? 'connecting' : '');
    tabs.push({
      value: `ssh:${cfg.id}`,
      label: `🖥️ ${cfg.name}`,
      icon: '🖥️',
      ssh: true,
      configId: cfg.id,
      statusClass
    });
  }

  el.innerHTML = tabs.map(t => `
    <button class="source-tab ${t.value === window.currentSource ? 'active' : ''} ${t.statusClass || ''}"
      data-source="${t.value}"
      onclick="switchSource('${escapeAttr(t.value)}')"
      oncontextmenu="${t.ssh ? `event.preventDefault();openSshTabContextMenu(event, '${escapeAttr(t.configId)}')` : ''}"
      title="${escapeAttr(t.label)}">
      ${t.ssh ? `<span class="ssh-status-dot ${t.statusClass}"></span>` : ''}
      <span class="source-tab-label">${escapeHtml(t.label)}</span>
    </button>
  `).join('') + `
    <button class="source-tab add-tab" onclick="openSshConfigModal()" title="${escapeAttr(t('ssh.addConnection'))}">
      <span>+</span>
    </button>
  `;

  el.style.display = 'flex';
}

async function switchSource(src) {
  // SSH 来源：尝试连接
  if (src.startsWith('ssh:')) {
    const configId = src.slice(4);
    const cfg = window.sshConfigs.find(c => c.id === configId);
    if (!cfg) return;

    // 检查是否已连接
    const invoke = window.__tauriInvoke;
    try {
      const connected = await invoke('get_ssh_connection_status', { configId });
      if (!connected) {
        // 显示连接中状态
        window.sshConnectionStatus[configId] = 'connecting';
        renderSourceTabs();
        showToast(t('ssh.connecting') + ' ' + cfg.name + '...');

        // 测试连接（会自动建立连接）
        const result = await invoke('test_ssh_connection', { configData: cfg });
        if (!result.success) {
          window.sshConnectionStatus[configId] = 'disconnected';
          renderSourceTabs();
          showToast(t('ssh.connectFailed') + ': ' + result.message);
          return;
        }
        window.sshConnectionStatus[configId] = 'connected';
        showToast(t('ssh.connected') + ' ' + cfg.name);
      }
    } catch (e) {
      window.sshConnectionStatus[configId] = 'disconnected';
      renderSourceTabs();
      showToast(t('ssh.connectFailed') + ': ' + e);
      return;
    }
  }

  window.currentSource = src;
  window.currentPlanId = null;
  window.currentPlan = null;
  document.getElementById('planView').style.display = 'none';
  document.getElementById('emptyState').style.display = '';
  renderSourceTabs();
  const plans = await loadPlanList();
  if (plans?.length > 0) loadPlan(plans[0].id);
}

// ── SSH Configuration Modal ─────────────────────────────────

function openSshConfigModal(configId) {
  const modal = document.getElementById('sshModal');
  const title = document.getElementById('sshModalTitle');
  const testResult = document.getElementById('sshTestResult');
  testResult.style.display = 'none';

  if (configId) {
    // 编辑模式
    const cfg = window.sshConfigs.find(c => c.id === configId);
    if (!cfg) return;
    title.textContent = t('ssh.editConnection');
    document.getElementById('sshConfigId').value = cfg.id;
    document.getElementById('sshName').value = cfg.name;
    document.getElementById('sshHost').value = cfg.host;
    document.getElementById('sshPort').value = cfg.port;
    document.getElementById('sshUsername').value = cfg.username;
    document.getElementById('sshRemoteDir').value = cfg.remote_claude_dir || '~/.claude';

    if (cfg.auth_method.type === 'Key') {
      document.getElementById('sshAuthMethod').value = 'Key';
      document.getElementById('sshKeyPath').value = cfg.auth_method.private_key_path || '';
      document.getElementById('sshPassphrase').value = cfg.auth_method.passphrase || '';
    } else {
      document.getElementById('sshAuthMethod').value = 'Password';
      document.getElementById('sshPassword').value = cfg.auth_method.password || '';
    }
  } else {
    // 新建模式
    title.textContent = t('ssh.addConnection');
    document.getElementById('sshConfigId').value = '';
    document.getElementById('sshName').value = '';
    document.getElementById('sshHost').value = '';
    document.getElementById('sshPort').value = '22';
    document.getElementById('sshUsername').value = '';
    document.getElementById('sshAuthMethod').value = 'Key';
    document.getElementById('sshKeyPath').value = '';
    document.getElementById('sshPassphrase').value = '';
    document.getElementById('sshPassword').value = '';
    document.getElementById('sshRemoteDir').value = '~/.claude';
  }

  toggleAuthFields();
  modal.style.display = 'flex';
}

function closeSshModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('sshModal').style.display = 'none';
}

function toggleAuthFields() {
  const method = document.getElementById('sshAuthMethod').value;
  document.getElementById('sshKeyGroup').style.display = method === 'Key' ? '' : 'none';
  document.getElementById('sshPassphraseGroup').style.display = method === 'Key' ? '' : 'none';
  document.getElementById('sshPasswordGroup').style.display = method === 'Password' ? '' : 'none';
}

async function saveSshConfig() {
  const id = document.getElementById('sshConfigId').value;
  const name = document.getElementById('sshName').value.trim();
  const host = document.getElementById('sshHost').value.trim();
  const port = parseInt(document.getElementById('sshPort').value) || 22;
  const username = document.getElementById('sshUsername').value.trim();
  const remoteDir = document.getElementById('sshRemoteDir').value.trim() || '~/.claude';
  const authMethod = document.getElementById('sshAuthMethod').value;

  if (!name || !host || !username) {
    showToast(t('ssh.fillRequired'));
    return;
  }

  let auth_method;
  if (authMethod === 'Key') {
    const keyPath = document.getElementById('sshKeyPath').value.trim();
    if (!keyPath) {
      showToast(t('ssh.fillKeyPath'));
      return;
    }
    const passphrase = document.getElementById('sshPassphrase').value || null;
    auth_method = { type: 'Key', private_key_path: keyPath, passphrase };
  } else {
    const password = document.getElementById('sshPassword').value;
    if (!password) {
      showToast(t('ssh.fillPassword'));
      return;
    }
    auth_method = { type: 'Password', password };
  }

  const configData = {
    id: id || '',
    name,
    host,
    port,
    username,
    auth_method,
    remote_claude_dir: remoteDir,
    created_at: '',
    last_connected: null
  };

  try {
    const invoke = window.__tauriInvoke;
    const saved = await invoke('save_ssh_config_command', { configData });
    // 更新本地状态
    const idx = window.sshConfigs.findIndex(c => c.id === saved.id);
    if (idx >= 0) {
      window.sshConfigs[idx] = saved;
    } else {
      window.sshConfigs.push(saved);
    }
    renderSourceTabs();
    closeSshModal();
    showToast(t('ssh.configSaved'));
  } catch (e) {
    showToast(t('ssh.saveFailed') + ': ' + e);
  }
}

async function deleteSshConfig(configId) {
  if (!confirm(t('ssh.deleteConfirm'))) return;

  try {
    const invoke = window.__tauriInvoke;
    await invoke('delete_ssh_config_command', { configId });
    window.sshConfigs = window.sshConfigs.filter(c => c.id !== configId);
    delete window.sshConnectionStatus[configId];

    // 如果当前来源是被删除的 SSH，切回 Windows
    if (window.currentSource === `ssh:${configId}`) {
      await switchSource('windows');
    } else {
      renderSourceTabs();
    }
    showToast(t('ssh.configDeleted'));
  } catch (e) {
    showToast(t('ssh.deleteFailed') + ': ' + e);
  }
}

async function testSshConnection() {
  const resultEl = document.getElementById('sshTestResult');
  resultEl.style.display = 'block';
  resultEl.className = 'ssh-test-result';
  resultEl.textContent = t('ssh.testing');

  // 构建临时配置用于测试
  const id = document.getElementById('sshConfigId').value || 'test-' + Date.now();
  const authMethod = document.getElementById('sshAuthMethod').value;
  let auth_method;
  if (authMethod === 'Key') {
    auth_method = {
      type: 'Key',
      private_key_path: document.getElementById('sshKeyPath').value.trim(),
      passphrase: document.getElementById('sshPassphrase').value || null
    };
  } else {
    auth_method = {
      type: 'Password',
      password: document.getElementById('sshPassword').value
    };
  }

  const configData = {
    id,
    name: document.getElementById('sshName').value.trim() || 'test',
    host: document.getElementById('sshHost').value.trim(),
    port: parseInt(document.getElementById('sshPort').value) || 22,
    username: document.getElementById('sshUsername').value.trim(),
    auth_method,
    remote_claude_dir: document.getElementById('sshRemoteDir').value.trim() || '~/.claude',
    created_at: '',
    last_connected: null
  };

  if (!configData.host || !configData.username) {
    resultEl.className = 'ssh-test-result error';
    resultEl.textContent = t('ssh.fillHostUser');
    return;
  }

  try {
    const invoke = window.__tauriInvoke;
    const result = await invoke('test_ssh_connection', { configData });
    if (result.success) {
      resultEl.className = 'ssh-test-result success';
      resultEl.textContent = '✅ ' + result.message;
      // 测试成功后断开（避免占用连接）
      await invoke('disconnect_ssh', { configId: id }).catch(() => {});
    } else {
      resultEl.className = 'ssh-test-result error';
      resultEl.textContent = '❌ ' + result.message;
    }
  } catch (e) {
    resultEl.className = 'ssh-test-result error';
    resultEl.textContent = t('ssh.testFailed') + ': ' + e;
  }
}

function openSshTabContextMenu(event, configId) {
  event.preventDefault();
  event.stopPropagation();

  const menu = document.getElementById('sshContextMenu');
  menu.style.display = 'block';
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  menu.dataset.configId = configId;

  // 根据连接状态显示/隐藏断开按钮
  const disconnectBtn = menu.querySelector('[data-action="disconnect"]');
  const isConnected = window.sshConnectionStatus[configId] === 'connected';
  disconnectBtn.style.display = isConnected ? '' : 'none';
}

function closeSshContextMenu() {
  const menu = document.getElementById('sshContextMenu');
  menu.style.display = 'none';
}

async function handleSshContextAction(action, configId) {
  closeSshContextMenu();

  switch (action) {
    case 'edit':
      openSshConfigModal(configId);
      break;
    case 'disconnect': {
      try {
        const invoke = window.__tauriInvoke;
        await invoke('disconnect_ssh', { configId });
        window.sshConnectionStatus[configId] = 'disconnected';
        renderSourceTabs();
        showToast(t('ssh.disconnected'));
        // 如果当前来源是该 SSH，切回 Windows
        if (window.currentSource === `ssh:${configId}`) {
          await switchSource('windows');
        }
      } catch (e) {
        showToast(t('ssh.disconnectFailed') + ': ' + e);
      }
      break;
    }
    case 'delete':
      await deleteSshConfig(configId);
      break;
  }
}

// Render plan list
async function loadPlanList() {
  const listEl = document.getElementById('planList');

  // SSH 来源显示加载指示器
  if (window.currentSource?.startsWith('ssh:')) {
    listEl.innerHTML = '<div class="plan-list-loading">' + t('sidebar.loadingRemote') + '</div>';
  }

  let plans;
  try {
    plans = await api('/plans');
  } catch (e) {
    listEl.innerHTML = `<div style="padding:20px;color:var(--accent-red);font-size:0.85rem;">❌ ${t('sidebar.loadError')}: ${escapeHtml(String(e))}</div>`;
    return null;
  }

  if (!plans || plans.length === 0) {
    listEl.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:0.85rem;">' + t('sidebar.empty') + '</div>';
    return plans;
  }

  listEl.innerHTML = plans.map(p => `
    <div class="plan-item ${p.id === window.currentPlanId ? 'active' : ''}" data-plan-id="${p.id}" onclick="loadPlan('${p.id}')">
      <div class="plan-item-name" title="${p.name}">${p.name}</div>
      <div class="plan-item-meta">
        <span>${timeAgo(p.modified)}</span>
        ${p.commentCount > 0 ? `<span class="badge">${p.commentCount} 💬</span>` : ''}
      </div>
    </div>
  `).join('');

  return plans;
}

// Update sidebar active state without full reload (O(n) DOM vs O(n) filesystem)
function updateSidebarActiveState(planId) {
  document.querySelectorAll('.plan-item').forEach(item => {
    item.classList.toggle('active', item.dataset.planId === planId);
  });
}

// Load and render a single plan
async function loadPlan(planId) {
  window.currentPlanId = planId;
  const plan = await api(`/plans/${encodeURIComponent(planId)}`);
  if (!plan) return;
  window.currentPlan = plan;

  // 应用计划内嵌 CSS
  applyPlanStyles(plan.content);

  // Show plan view, hide empty state
  document.getElementById('emptyState').style.display = 'none';
  const planView = document.getElementById('planView');
  planView.style.display = 'flex';

  // Update toolbar
  document.getElementById('planFileName').textContent = plan.name;
  document.getElementById('planModified').textContent = `${t('toolbar.modified')}: ${new Date(plan.modified).toLocaleString()}`;

  // Render markdown with section wrappers and inline comments
  renderMarkdown(plan.content, plan.comments);

  // Update sidebar active state (lightweight DOM update, no IPC)
  updateSidebarActiveState(planId);
}

async function refreshCurrentPlan() {
  if (window.currentPlanId) await loadPlan(window.currentPlanId);
}

// Lazy-load beautiful-mermaid only when mermaid blocks are detected
function loadMermaidIfNeeded(mdPane) {
  const mermaidDivs = mdPane.querySelectorAll('.mermaid');
  if (mermaidDivs.length === 0) return Promise.resolve();
  if (window.beautifulMermaid) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/beautiful-mermaid/dist/beautiful-mermaid.browser.global.js';
    script.onload = resolve;
    script.onerror = resolve; // Don't block on load failure
    document.head.appendChild(script);
  });
}

// Render markdown content
function renderMarkdown(content, comments) {
  const mdPane = document.getElementById('mdContent');

  // First, render raw markdown
  let html = window.marked.parse(content);

  // Wrap each heading section for comment triggers
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const sections = [];
  let currentSection = null;

  for (const node of [...tempDiv.childNodes]) {
    const tagName = node.tagName ? node.tagName.toLowerCase() : '';
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: node.textContent,
        tag: tagName,
        elements: [node.outerHTML]
      };
    } else if (currentSection) {
      currentSection.elements.push(node.outerHTML || node.textContent);
    } else {
      if (!currentSection) currentSection = { title: '', tag: '', elements: [] };
      currentSection.elements.push(node.outerHTML || node.textContent);
    }
  }
  if (currentSection) sections.push(currentSection);

  // Build final HTML with section wrappers
  const commentsBySection = {};
  for (const c of (comments || [])) {
    // 过滤 plan-level 评价，不参与 inline 渲染
    if (!c.sectionTitle && !c.selectedText) continue;
    const key = c.sectionTitle || '';
    if (!commentsBySection[key]) commentsBySection[key] = [];
    commentsBySection[key].push(c);
  }

  let finalHtml = '';
  for (const sec of sections) {
    const hasComments = commentsBySection[sec.title]?.length > 0;
    const count = commentsBySection[sec.title]?.length || 0;
    finalHtml += `<div class="md-section ${hasComments ? 'has-comments' : ''}" data-section="${escapeAttr(sec.title)}">`;
    if (sec.title) {
      finalHtml += `<span class="comment-trigger ${hasComments ? 'has-comments' : ''}"
        onclick="openCommentForm(this, '${escapeAttr(sec.title)}')"
        title="${hasComments ? count + ' ' + t('comments.commentCount') : t('comments.addComment')}">
        ${hasComments ? count : '+'}
      </span>`;
    }
    finalHtml += sec.elements.join('');

    // 注入该 section 的内联评论卡片
    const sectionComments = commentsBySection[sec.title] || [];
    if (sectionComments.length > 0) {
      finalHtml += '<div class="section-comments">';
      for (const c of sectionComments) {
        const type = c.type || c.comment_type || 'comment';
        const hasSelection = !!c.selectedText;
        const selectionExcerpt = hasSelection
          ? (c.selectedText.length > 60 ? c.selectedText.slice(0, 60) + '...' : c.selectedText)
          : '';
        finalHtml += `
          <div class="inline-comment-card ${type}" id="card-${c.id}">
            <div class="inline-comment-text">
              ${hasSelection ? `<div class="inline-form-context">"${escapeHtml(selectionExcerpt)}"</div>` : ''}
              ${escapeHtml(c.text)}
              <div class="inline-comment-meta">${timeAgo(c.createdAt)}</div>
            </div>
            <div class="inline-comment-actions">
              <button onclick="deleteComment('${c.id}')" title="Delete">🗑️</button>
            </div>
          </div>`;
      }
      finalHtml += '</div>';
    }

    finalHtml += '</div>';
  }

  mdPane.innerHTML = finalHtml;

  // 同步渲染评论面板（不依赖 DOM paint，写入独立的面板元素）
  renderCommentPanel(comments);

  // Render mermaid diagrams
  requestAnimationFrame(async () => {
    const mermaidBlocks = mdPane.querySelectorAll('pre code.language-mermaid');
    for (const block of mermaidBlocks) {
      const pre = block.parentElement;
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid';
      mermaidDiv.textContent = block.textContent;
      pre.replaceWith(mermaidDiv);
    }

    // Check for mermaid blocks
    const allCodeBlocks = mdPane.querySelectorAll('pre code');
    for (const block of allCodeBlocks) {
      const text = block.textContent.trim();
      if (text.startsWith('graph ') || text.startsWith('sequenceDiagram') ||
          text.startsWith('classDiagram') || text.startsWith('flowchart') ||
          text.startsWith('erDiagram') || text.startsWith('gantt') ||
          text.startsWith('pie') || text.startsWith('gitgraph') ||
          text.startsWith('stateDiagram')) {
        const pre = block.parentElement;
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.textContent = text;
        pre.replaceWith(mermaidDiv);
      }
    }

    // Lazy-load and render mermaid if needed
    await loadMermaidIfNeeded(mdPane);
    if (window.beautifulMermaid) {
      const { renderMermaid } = window.beautifulMermaid;
      const colors = THEME_CONFIG[getCurrentTheme()].mermaid;
      const mermaidDivs = mdPane.querySelectorAll('.mermaid');
      for (const div of mermaidDivs) {
        try {
          const source = div.textContent;
          div.dataset.mermaidSource = source;
          const svg = await renderMermaid(source, colors);
          div.innerHTML = svg;
        } catch (e) {
          console.warn('Mermaid render warning:', e);
          div.textContent = 'Diagram render error: ' + e.message;
        }
      }
    }

    // Highlight text selections from existing comments
    highlightSelections(comments);
  });
}

// Highlight text selections
function highlightSelections(comments) {
  const mdPane = document.getElementById('mdContent');
  if (!comments) return;

  const selComments = comments.filter(c => c.selectedText && c.status !== 'resolved');
  if (selComments.length === 0) return;

  for (const comment of selComments) {
    const needle = comment.selectedText;
    const walker = document.createTreeWalker(mdPane, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('pre') || parent.closest('code') || parent.closest('.mermaid') || parent.closest('.text-selection-highlight')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    let found = false;
    for (let i = 0; i < textNodes.length && !found; i++) {
      let concat = '';
      let nodeSpans = [];
      for (let j = i; j < textNodes.length; j++) {
        nodeSpans.push({ node: textNodes[j], startInConcat: concat.length, length: textNodes[j].textContent.length });
        concat += textNodes[j].textContent;
        const idx = concat.indexOf(needle);
        if (idx !== -1) {
          wrapMatchAcrossNodes(nodeSpans, idx, needle.length, comment.id);
          found = true;
          break;
        }
        if (concat.length > needle.length * 3) break;
      }
    }
  }
}

function wrapMatchAcrossNodes(nodeSpans, matchStart, matchLen, commentId) {
  const matchEnd = matchStart + matchLen;
  for (const span of nodeSpans) {
    const nodeStart = span.startInConcat;
    const nodeEnd = nodeStart + span.length;
    const overlapStart = Math.max(matchStart, nodeStart);
    const overlapEnd = Math.min(matchEnd, nodeEnd);
    if (overlapStart >= overlapEnd) continue;

    const localStart = overlapStart - nodeStart;
    const localEnd = overlapEnd - nodeStart;
    const textNode = span.node;
    const text = textNode.textContent;

    const before = text.slice(0, localStart);
    const match = text.slice(localStart, localEnd);
    const after = text.slice(localEnd);

    const mark = document.createElement('mark');
    mark.className = 'text-selection-highlight';
    mark.dataset.commentId = commentId;
    mark.textContent = match;
    mark.onclick = () => scrollToCommentCard(commentId);

    const parent = textNode.parentNode;
    if (before) parent.insertBefore(document.createTextNode(before), textNode);
    parent.insertBefore(mark, textNode);
    if (after) parent.insertBefore(document.createTextNode(after), textNode);
    parent.removeChild(textNode);
  }
}

function scrollToCommentCard(commentId) {
  const card = document.getElementById('card-' + commentId);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.borderColor = 'var(--accent-orange)';
    setTimeout(() => card.style.borderColor = '', 2000);
  }
}

// Comment form functions
function closeAllInlineForms() {
  document.querySelectorAll('.inline-comment-form').forEach(f => f.remove());
}

function openCommentForm(trigger, sectionTitle, selectedText) {
  closeAllInlineForms();
  const section = document.querySelector(`.md-section[data-section="${CSS.escape(sectionTitle)}"]`);
  if (!section) return;

  window.commentFormContext = { sectionTitle, selectedText: selectedText || '' };

  // 构建上下文提示
  let contextHtml = '';
  if (selectedText) {
    const excerpt = selectedText.length > 80 ? selectedText.slice(0, 80) + '...' : selectedText;
    contextHtml = `<div class="inline-form-context">📝 "${escapeHtml(excerpt)}"</div>`;
  }

  const placeholderText = t('comments.leaveComment');
  const cancelText = t('comments.cancel');
  const submitText = t('comments.addCommentBtn');

  const formHtml = `
    <div class="inline-comment-form" id="inlineCommentFormWrapper">
      ${contextHtml}
      <textarea id="inlineCommentText" placeholder="${escapeAttr(placeholderText)}" rows="2"></textarea>
      <div class="inline-form-row">
        <div class="inline-form-types">
          <button class="type-btn active" data-type="comment" title="${escapeAttr(t('commentType.comment'))}" onclick="selectCommentType(this)">💬</button>
          <button class="type-btn" data-type="suggestion" title="${escapeAttr(t('commentType.suggestion'))}" onclick="selectCommentType(this)">💡</button>
          <button class="type-btn" data-type="question" title="${escapeAttr(t('commentType.question'))}" onclick="selectCommentType(this)">❓</button>
          <button class="type-btn" data-type="approve" title="${escapeAttr(t('commentType.approve'))}" onclick="selectCommentType(this)">✅</button>
          <button class="type-btn" data-type="reject" title="${escapeAttr(t('commentType.reject'))}" onclick="selectCommentType(this)">❌</button>
        </div>
        <div class="inline-form-actions">
          <button class="toolbar-btn" onclick="closeAllInlineForms()">${escapeHtml(cancelText)}</button>
          <button class="toolbar-btn primary" onclick="submitInlineComment()">${escapeHtml(submitText)}</button>
        </div>
      </div>
    </div>`;

  section.insertAdjacentHTML('beforeend', formHtml);
  document.getElementById('inlineCommentText')?.focus();
}

function cancelComment() {
  closeAllInlineForms();
  window.commentFormContext = {};
}

async function deleteComment(commentId) {
  await api(`/comments/${commentId}/delete`, {
    method: 'POST',
    body: JSON.stringify({ planId: window.currentPlanId })
  });
  refreshCurrentPlan();
}

async function submitInlineComment() {
  const textarea = document.getElementById('inlineCommentText');
  const text = textarea?.value.trim();
  if (!text || !window.currentPlanId) return;

  const formWrapper = document.getElementById('inlineCommentFormWrapper');
  const type = formWrapper?.querySelector('.type-btn.active')?.dataset.type || 'comment';

  await api(`/plans/${encodeURIComponent(window.currentPlanId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      type,
      sectionTitle: window.commentFormContext.sectionTitle || '',
      selectedText: window.commentFormContext.selectedText || ''
    })
  });

  closeAllInlineForms();
  window.commentFormContext = {};

  showToast(t('comments.added'));
  refreshCurrentPlan();
}

function scrollToSection(title) {
  if (!title) return;
  const sections = document.querySelectorAll('.md-section');
  for (const sec of sections) {
    if (sec.dataset.section === title) {
      sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sec.style.borderLeftColor = 'var(--accent-blue)';
      setTimeout(() => sec.style.borderLeftColor = '', 2000);
      break;
    }
  }
}

function scrollToHighlight(commentId) {
  const mark = document.querySelector(`.text-selection-highlight[data-comment-id="${commentId}"]`);
  if (mark) {
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mark.style.background = 'rgba(210, 153, 34, 0.5)';
    setTimeout(() => mark.style.background = '', 2000);
  }
}

// Text selection handling
let pendingSelectionText = '';

// ── 评论面板状态管理 ─────────────────────────────────
let commentPanelOpen = localStorage.getItem('commentPanelOpen') === 'true';

function toggleCommentPanel() {
  commentPanelOpen = !commentPanelOpen;
  localStorage.setItem('commentPanelOpen', commentPanelOpen);
  applyCommentPanelState();
}

function applyCommentPanelState() {
  const panel = document.getElementById('commentPanel');
  if (panel) {
    panel.classList.toggle('open', commentPanelOpen);
  }
}

// ── 面板渲染 ─────────────────────────────────
function renderCommentPanel(comments) {
  const panelComments = document.getElementById('panelComments');
  const panelEval = document.getElementById('panelEvaluation');
  const countEl = document.getElementById('commentPanelCount');
  const badgeEl = document.getElementById('panelBadge');
  if (!panelComments || !panelEval) return;

  const allComments = comments || [];
  const totalCount = allComments.length;

  // 更新计数
  if (countEl) countEl.textContent = totalCount > 0 ? totalCount : '';
  if (badgeEl) {
    if (totalCount > 0) {
      badgeEl.textContent = totalCount;
      badgeEl.style.display = '';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  // 分离 plan-level 评价和 section 评论
  const planEvals = allComments.filter(c => !c.sectionTitle && !c.selectedText);
  const sectionComments = allComments.filter(c => c.sectionTitle || c.selectedText);

  // 渲染评价区域
  renderEvaluationSection(panelEval, planEvals);

  // 按 section 分组
  if (sectionComments.length === 0 && planEvals.length === 0) {
    panelComments.innerHTML = `<div class="panel-empty">${t('panel.empty')}</div>`;
    return;
  }

  const groups = {};
  for (const c of sectionComments) {
    const key = c.sectionTitle || t('panel.ungrouped');
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }

  let html = '';
  for (const [sectionTitle, items] of Object.entries(groups)) {
    html += `<div class="panel-section">`;
    html += `<div class="panel-section-header" onclick="togglePanelSection(this)">`;
    html += `<span class="panel-section-chevron">▼</span>`;
    html += `<span class="panel-section-title" title="${escapeAttr(sectionTitle)}">${escapeHtml(sectionTitle)}</span>`;
    html += `<span class="panel-section-count">${items.length}</span>`;
    html += `</div>`;
    html += `<div class="panel-section-body">`;
    for (const c of items) {
      html += buildPanelCommentItem(c);
    }
    html += `</div></div>`;
  }

  panelComments.innerHTML = html;
}

function buildPanelCommentItem(c) {
  const type = c.type || c.comment_type || 'comment';
  const hasSelection = !!c.selectedText;
  const emojiMap = { comment: '💬', suggestion: '💡', question: '❓', approve: '✅', reject: '❌' };
  const emoji = emojiMap[type] || '💬';
  const textExcerpt = c.text.length > 80 ? c.text.slice(0, 80) + '...' : c.text;

  return `
    <div class="panel-comment-item ${type}"
         onclick="panelCommentClick('${escapeAttr(c.id)}', '${escapeAttr(c.sectionTitle || '')}', ${hasSelection})">
      <span class="panel-comment-emoji">${emoji}</span>
      <div class="panel-comment-body">
        <div class="panel-comment-text">${escapeHtml(textExcerpt)}</div>
        <div class="panel-comment-meta">${timeAgo(c.createdAt)}</div>
      </div>
      <button class="panel-comment-delete" onclick="event.stopPropagation();deleteComment('${c.id}')" title="Delete">🗑️</button>
    </div>`;
}

// ── 评价功能 ─────────────────────────────────
function renderEvaluationSection(container, planEvals) {
  let html = '';
  html += `<div class="panel-eval-header">${t('panel.evaluation')}</div>`;
  html += `<div class="panel-eval-form">`;
  html += `<div class="panel-eval-types">`;
  html += `<button class="type-btn active" data-type="comment" title="${escapeAttr(t('commentType.comment'))}" onclick="selectEvalType(this)">💬</button>`;
  html += `<button class="type-btn" data-type="suggestion" title="${escapeAttr(t('commentType.suggestion'))}" onclick="selectEvalType(this)">💡</button>`;
  html += `<button class="type-btn" data-type="question" title="${escapeAttr(t('commentType.question'))}" onclick="selectEvalType(this)">❓</button>`;
  html += `<button class="type-btn" data-type="approve" title="${escapeAttr(t('commentType.approve'))}" onclick="selectEvalType(this)">✅</button>`;
  html += `<button class="type-btn" data-type="reject" title="${escapeAttr(t('commentType.reject'))}" onclick="selectEvalType(this)">❌</button>`;
  html += `</div>`;
  html += `<textarea class="panel-eval-textarea" id="evalText" placeholder="${escapeAttr(t('panel.evalPlaceholder'))}" rows="2"></textarea>`;
  html += `<button class="panel-eval-submit" onclick="submitEvaluation()">${escapeHtml(t('comments.addCommentBtn'))}</button>`;
  html += `</div>`;

  // 已有的评价列表
  if (planEvals.length > 0) {
    html += `<div class="panel-eval-list">`;
    for (const c of planEvals) {
      const type = c.type || c.comment_type || 'comment';
      const emojiMap = { comment: '💬', suggestion: '💡', question: '❓', approve: '✅', reject: '❌' };
      html += `
        <div class="panel-eval-item ${type}">
          <span>${emojiMap[type] || '💬'}</span>
          <div class="inline-comment-text">
            ${escapeHtml(c.text)}
            <div class="inline-comment-meta">${timeAgo(c.createdAt)}</div>
          </div>
          <div class="inline-comment-actions">
            <button onclick="deleteComment('${c.id}')" title="Delete">🗑️</button>
          </div>
        </div>`;
    }
    html += `</div>`;
  }

  container.innerHTML = html;
}

function selectEvalType(btn) {
  const container = btn.closest('.panel-eval-types');
  if (!container) return;
  container.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function submitEvaluation() {
  const textarea = document.getElementById('evalText');
  const text = textarea?.value.trim();
  if (!text || !window.currentPlanId) return;

  const evalTypes = document.querySelector('.panel-eval-types');
  const type = evalTypes?.querySelector('.type-btn.active')?.dataset.type || 'comment';

  await api(`/plans/${encodeURIComponent(window.currentPlanId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      type,
      sectionTitle: '',
      selectedText: ''
    })
  });

  showToast(t('panel.evalAdded'));
  refreshCurrentPlan();
}

// ── 面板导航 ─────────────────────────────────
function panelCommentClick(commentId, sectionTitle, hasSelection) {
  if (hasSelection) {
    // 尝试滚动到高亮文本，失败则回退到评论卡片
    const mark = document.querySelector(`.text-selection-highlight[data-comment-id="${commentId}"]`);
    if (mark) {
      scrollToHighlight(commentId);
    } else {
      scrollToCommentCard(commentId);
    }
  } else if (sectionTitle) {
    scrollToSection(sectionTitle);
    // 延迟后滚动到卡片
    setTimeout(() => scrollToCommentCard(commentId), 400);
  } else {
    scrollToCommentCard(commentId);
  }
}

function togglePanelSection(headerEl) {
  const section = headerEl.closest('.panel-section');
  if (section) {
    section.classList.toggle('collapsed');
  }
}

// 评论类型选择器（内联表单 scoped）
function selectCommentType(btn) {
  const container = btn.closest('.inline-form-types');
  if (!container) return;
  container.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// 保存自定义 CSS（CSS 编辑器模态框的保存按钮调用）
async function saveCustomCss() {
  const textarea = document.getElementById('cssEditorText');
  if (!textarea) return;

  const css = textarea.value;
  await saveGlobalCustomCSS(css);
  closeCssEditor();
  showToast(t('styles.customCssSaved'));
}

function handleTextSelection(e) {
  const tooltip = document.getElementById('selectionTooltip');
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) {
    tooltip.classList.remove('visible');
    return;
  }

  const text = sel.toString().trim();
  if (text.length < 3) {
    tooltip.classList.remove('visible');
    return;
  }

  const mdContent = document.getElementById('mdContent');
  const anchorInMd = mdContent.contains(sel.anchorNode);
  const focusInMd = mdContent.contains(sel.focusNode);
  if (!anchorInMd || !focusInMd) {
    tooltip.classList.remove('visible');
    return;
  }

  const anchorParent = sel.anchorNode.parentElement;
  if (anchorParent && (anchorParent.closest('pre') || anchorParent.closest('code'))) {
    tooltip.classList.remove('visible');
    return;
  }

  pendingSelectionText = text;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  tooltip.style.top = (rect.top - 40) + 'px';
  tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
  tooltip.classList.add('visible');
}

// Initialize application
export async function initApp() {
  // Apply saved theme
  applyTheme(localStorage.getItem('theme') || 'dark');

  // 初始化样式注入系统
  await initStyles();

  // 注册语言切换回调 - 重渲染动态内容
  onLangChange(() => {
    if (window.currentPlan) {
      renderMarkdown(window.currentPlan.content, window.currentPlan.comments);
    }
    loadPlanList();
    renderSourceTabs();
    updatePresetSelector();
  });

  // Make functions globally available
  window.toggleTheme = toggleTheme;
  window.loadPlan = loadPlan;
  window.refreshCurrentPlan = refreshCurrentPlan;
  window.openCommentForm = openCommentForm;
  window.cancelComment = cancelComment;
  window.submitInlineComment = submitInlineComment;
  window.closeAllInlineForms = closeAllInlineForms;
  window.deleteComment = deleteComment;
  window.scrollToSection = scrollToSection;
  window.scrollToHighlight = scrollToHighlight;
  window.switchSource = switchSource;
  window.openSshConfigModal = openSshConfigModal;
  window.closeSshModal = closeSshModal;
  window.toggleAuthFields = toggleAuthFields;
  window.saveSshConfig = saveSshConfig;
  window.deleteSshConfig = deleteSshConfig;
  window.testSshConnection = testSshConnection;
  window.openSshTabContextMenu = openSshTabContextMenu;
  window.closeSshContextMenu = closeSshContextMenu;
  window.handleSshContextAction = handleSshContextAction;
  window.selectCommentType = selectCommentType;
  window.setPreset = setPreset;
  window.openCssEditor = openCssEditor;
  window.closeCssEditor = closeCssEditor;
  window.saveCustomCss = saveCustomCss;
  window.toggleCommentPanel = toggleCommentPanel;
  window.renderCommentPanel = renderCommentPanel;
  window.selectEvalType = selectEvalType;
  window.submitEvaluation = submitEvaluation;
  window.panelCommentClick = panelCommentClick;
  window.togglePanelSection = togglePanelSection;

  // WSL 检测（仅 Tauri 模式）
  if (window.useTauri) {
    try {
      window.wslInfo = await window.__tauriInvoke('detect_wsl');
    } catch (e) {
      console.warn('WSL 检测失败:', e);
    }
    // 加载 SSH 配置
    try {
      window.sshConfigs = await window.__tauriInvoke('get_ssh_configs');
    } catch (e) {
      console.warn('SSH 配置加载失败:', e);
      window.sshConfigs = [];
    }
  }
  renderSourceTabs();

  // 恢复评论面板状态
  applyCommentPanelState();

  // Load plan list (single IPC call, reuse return value)
  const plans = await loadPlanList();

  // Replace loading spinner with normal empty state content
  const emptyState = document.getElementById('emptyState');
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.remove();
  if (emptyState) {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('viewBox', '0 0 24 24');
    svgEl.setAttribute('fill', 'none');
    svgEl.setAttribute('stroke', 'currentColor');
    svgEl.setAttribute('stroke-width', '1.5');
    svgEl.style.cssText = 'width: 64px; height: 64px; opacity: 0.3;';
    svgEl.innerHTML = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>';
    const h3 = document.createElement('h3');
    h3.textContent = t('emptyState.title');
    const p = emptyState.querySelector('p');
    if (p) p.textContent = t('emptyState.desc');
    emptyState.insertBefore(h3, p);
    emptyState.insertBefore(svgEl, h3);
  }

  // Auto-load first plan if available (no duplicate IPC call)
  if (plans && plans.length > 0) {
    loadPlan(plans[0].id);
  }

  // 再次应用 i18n（确保动态生成的元素也被翻译）
  applyI18n();

  // Set up text selection handler
  const markdownPane = document.getElementById('markdownPane');
  if (markdownPane) {
    markdownPane.addEventListener('mouseup', (e) => {
      setTimeout(() => handleTextSelection(e), 10);
    });
  }

  // Set up selection tooltip handler
  const tooltip = document.getElementById('selectionTooltip');
  if (tooltip) {
    tooltip.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
    tooltip.addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip.classList.remove('visible');
      if (!pendingSelectionText) return;
      const sel = window.getSelection();
      let sectionTitle = '';
      if (sel && sel.anchorNode) {
        const sectionEl = sel.anchorNode.parentElement?.closest('.md-section');
        if (sectionEl) sectionTitle = sectionEl.dataset.section || '';
      }
      sel.removeAllRanges();
      const selectedText = pendingSelectionText;
      pendingSelectionText = '';
      openCommentForm(null, sectionTitle, selectedText);
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cancelComment();
      closeSshContextMenu();
      closeCssEditor();
      // 关闭评论面板
      if (commentPanelOpen) {
        commentPanelOpen = false;
        localStorage.setItem('commentPanelOpen', 'false');
        applyCommentPanelState();
      }
      document.getElementById('selectionTooltip')?.classList.remove('visible');
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (document.activeElement === document.getElementById('inlineCommentText')) {
        submitInlineComment();
      }
    }
  });

  // Context menu: close on click outside, delegate actions
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('sshContextMenu');
    if (menu && menu.style.display !== 'none') {
      const item = e.target.closest('.context-menu-item');
      if (item && item.dataset.action) {
        handleSshContextAction(item.dataset.action, menu.dataset.configId);
      } else if (!menu.contains(e.target)) {
        closeSshContextMenu();
      }
    }
  });

  // Show window after initialization (eliminates white flash on startup)
  if (window.useTauri) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().show();
    } catch (e) {
      console.warn('Failed to show window:', e);
    }
  }

  console.log('🚀 Plan Viewer initialized');
  console.log(window.useTauri ? '🖥️ Running in Tauri mode' : '🌐 Running in browser mode');
}
