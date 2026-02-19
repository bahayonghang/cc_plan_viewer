// Plan Viewer - Application Logic
// Supports both Tauri (desktop) and browser modes

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
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }
}

// Source switcher for WSL integration
function renderSourceSwitcher() {
  const el = document.getElementById('sourceSwitcher');
  if (!el || !window.useTauri || !window.wslInfo?.available) {
    if (el) el.style.display = 'none';
    return;
  }
  const opts = [
    { value: 'windows', label: '🪟 Windows' },
    ...window.wslInfo.distributions.map(d => ({
      value: `wsl:${d}`, label: `🐧 WSL: ${d}`
    }))
  ];
  el.innerHTML = `<select id="sourceSelect" onchange="switchSource(this.value)">
    ${opts.map(o => `<option value="${o.value}" ${o.value === window.currentSource ? 'selected' : ''}>${o.label}</option>`).join('')}
  </select>`;
  el.style.display = 'block';
}

async function switchSource(src) {
  window.currentSource = src;
  window.currentPlanId = null;
  window.currentPlan = null;
  document.getElementById('planView').style.display = 'none';
  document.getElementById('emptyState').style.display = '';
  const plans = await loadPlanList();
  if (plans?.length > 0) loadPlan(plans[0].id);
}

// Render plan list
async function loadPlanList() {
  const plans = await api('/plans');
  const listEl = document.getElementById('planList');

  if (!plans || plans.length === 0) {
    listEl.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:0.85rem;">No plans yet. Switch Claude Code to plan mode to see plans here.</div>';
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

  // Show plan view, hide empty state
  document.getElementById('emptyState').style.display = 'none';
  const planView = document.getElementById('planView');
  planView.style.display = 'flex';

  // Update toolbar
  document.getElementById('planFileName').textContent = plan.name;
  document.getElementById('planModified').textContent = `Modified: ${new Date(plan.modified).toLocaleString()}`;

  // Render markdown with section wrappers
  renderMarkdown(plan.content, plan.comments);

  // Render comments pane
  renderComments(plan.comments);

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
        title="${hasComments ? count + ' comment(s)' : 'Add comment'}">
        ${hasComments ? count : '+'}
      </span>`;
    }
    finalHtml += sec.elements.join('');
    finalHtml += '</div>';
  }

  mdPane.innerHTML = finalHtml;

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

// Render comments pane
function renderComments(comments) {
  const header = document.getElementById('commentsPaneHeader');
  const list = document.getElementById('commentsList');

  const all = comments || [];
  header.textContent = `Comments (${all.length})`;

  if (all.length === 0) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:12px;">No comments yet. Click the + button next to any section, or select text to add a review comment.</div>';
    return;
  }

  list.innerHTML = all.map(c => {
    const hasSelection = !!c.selectedText;
    const selectionExcerpt = hasSelection ? (c.selectedText.length > 60 ? c.selectedText.slice(0, 60) + '...' : c.selectedText) : '';
    let contextHtml = '';
    if (hasSelection) {
      contextHtml = `<div class="comment-card-context">"${escapeHtml(selectionExcerpt)}"</div>`;
    } else if (c.sectionTitle) {
      contextHtml = `<div class="comment-card-context">Section: ${escapeHtml(c.sectionTitle)}</div>`;
    }
    return `
    <div class="comment-card" id="card-${c.id}">
      <button class="comment-card-delete" onclick="deleteComment('${c.id}')" title="Delete comment">✕</button>
      <div class="comment-card-header">
        <span class="comment-type-badge ${c.type || c.comment_type}">${c.type || c.comment_type}</span>
      </div>
      ${contextHtml}
      <div class="comment-card-text">${escapeHtml(c.text)}</div>
      <div class="comment-card-time">${timeAgo(c.created_at)}</div>
      <div class="comment-card-actions">
        ${hasSelection
          ? `<button onclick="scrollToHighlight('${c.id}')">↗ Go to highlight</button>`
          : (c.sectionTitle ? `<button onclick="scrollToSection('${escapeAttr(c.sectionTitle)}')">↗ Go to section</button>` : '')
        }
      </div>
    </div>`;
  }).join('');
}

// Comment form functions
function openCommentForm(trigger, sectionTitle, selectedText) {
  const contextEl = document.getElementById('globalCommentContext');
  const textarea = document.getElementById('globalCommentText');

  if (selectedText) {
    const excerpt = selectedText.length > 80 ? selectedText.slice(0, 80) + '...' : selectedText;
    contextEl.textContent = `📝 "${excerpt}"`;
  } else {
    contextEl.textContent = `📌 Section: ${sectionTitle}`;
  }
  contextEl.classList.add('visible');

  window.commentFormContext = { sectionTitle, selectedText: selectedText || '' };
  textarea.focus();
}

function cancelComment() {
  const contextEl = document.getElementById('globalCommentContext');
  const textarea = document.getElementById('globalCommentText');
  contextEl.classList.remove('visible');
  contextEl.textContent = '';
  textarea.value = '';
  window.commentFormContext = {};
}

async function deleteComment(commentId) {
  await api(`/comments/${commentId}/delete`, {
    method: 'POST',
    body: JSON.stringify({ planId: window.currentPlanId })
  });
  refreshCurrentPlan();
}

async function submitGlobalComment() {
  const textarea = document.getElementById('globalCommentText');
  const text = textarea.value.trim();
  if (!text || !window.currentPlanId) return;

  await api(`/plans/${encodeURIComponent(window.currentPlanId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      type: 'comment',
      sectionTitle: window.commentFormContext.sectionTitle || '',
      selectedText: window.commentFormContext.selectedText || ''
    })
  });

  textarea.value = '';
  const contextEl = document.getElementById('globalCommentContext');
  contextEl.classList.remove('visible');
  contextEl.textContent = '';
  window.commentFormContext = {};

  showToast('💬 Comment added & written to plan file');
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

  // Make functions globally available
  window.toggleTheme = toggleTheme;
  window.loadPlan = loadPlan;
  window.refreshCurrentPlan = refreshCurrentPlan;
  window.openCommentForm = openCommentForm;
  window.cancelComment = cancelComment;
  window.submitGlobalComment = submitGlobalComment;
  window.deleteComment = deleteComment;
  window.scrollToSection = scrollToSection;
  window.scrollToHighlight = scrollToHighlight;
  window.switchSource = switchSource;

  // WSL 检测（仅 Tauri 模式）
  if (window.useTauri) {
    try {
      window.wslInfo = await window.__tauriInvoke('detect_wsl');
    } catch (e) {
      console.warn('WSL 检测失败:', e);
    }
  }
  renderSourceSwitcher();

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
    h3.textContent = 'Select a plan to review';
    const p = emptyState.querySelector('p');
    if (p) p.textContent = 'Choose a plan from the sidebar, or wait for Claude Code to generate one.';
    emptyState.insertBefore(h3, p);
    emptyState.insertBefore(svgEl, h3);
  }

  // Auto-load first plan if available (no duplicate IPC call)
  if (plans && plans.length > 0) {
    loadPlan(plans[0].id);
  }

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
      document.getElementById('selectionTooltip')?.classList.remove('visible');
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (document.activeElement === document.getElementById('globalCommentText')) {
        submitGlobalComment();
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
