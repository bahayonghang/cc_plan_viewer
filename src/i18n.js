// Plan Viewer - i18n 国际化模块

const translations = {
  zh: {
    theme: { dark: '暗色', light: '亮色' },
    sidebar: {
      plans: '📋 计划列表',
      loading: '加载计划...',
      loadingRemote: '加载远程计划...',
      empty: '暂无计划。切换 Claude Code 到 plan 模式即可在此查看计划。',
      loadError: '加载失败'
    },
    toolbar: {
      refresh: '⟳ 刷新',
      modified: '修改时间'
    },
    comments: {
      header: '评论',
      empty: '暂无评论。点击段落旁的 + 按钮，或选中文字添加评审评论。',
      placeholder: '添加评论... (Ctrl+Enter 提交)',
      placeholderMac: '添加评论... (⌘+Enter 提交)',
      submit: '提交',
      cancel: '取消',
      selectionTooltip: '💬 评论选中文字',
      added: '💬 评论已添加并写入计划文件',
      sectionPrefix: '段落',
      goToHighlight: '↗ 跳转高亮',
      goToSection: '↗ 跳转段落',
      commentCount: '条评论',
      addComment: '添加评论',
      leaveComment: '留下评论...',
      addCommentBtn: '添加评论'
    },
    time: {
      justNow: '刚刚',
      minutesAgo: '分钟前',
      hoursAgo: '小时前',
      daysAgo: '天前'
    },
    emptyState: {
      title: '选择一个计划进行评审',
      desc: '从侧边栏选择计划，或等待 Claude Code 生成新计划。'
    },
    commentType: {
      comment: '评论',
      suggestion: '建议',
      question: '疑问',
      approve: '通过',
      reject: '拒绝'
    },
    panel: {
      title: '💬 评论导航',
      toggleTitle: '打开/关闭评论面板',
      evaluation: '📋 整体评价',
      evalPlaceholder: '对整个计划的评价...',
      evalAdded: '📋 整体评价已添加',
      empty: '暂无评论。在左侧内容中添加评论后，将在此处显示。',
      ungrouped: '未分组评论'
    },
    styles: {
      presetLabel: '显示风格',
      default: '默认',
      compact: '紧凑',
      spacious: '宽松',
      academic: '学术',
      minimal: '极简',
      customCssTitle: '自定义 CSS',
      customCssHint: '自定义 CSS 将在所有预设之上生效，可覆盖任意样式。',
      customCssSaved: '✅ 自定义样式已保存',
      customCssBtn: '{CSS}'
    },
    ssh: {
      addConnection: '添加 SSH 连接',
      editConnection: '编辑 SSH 连接',
      editConfig: '✏️ 编辑配置',
      disconnect: '🔌 断开连接',
      delete: '🗑️ 删除',
      displayName: '显示名称',
      host: '主机',
      username: '用户名',
      port: '端口',
      authMethod: '认证方式',
      keyFile: '密钥文件',
      password: '密码',
      privateKeyPath: '私钥路径',
      keyPassphrase: '密钥密码 (可选)',
      remoteClaude: '远程 .claude 目录',
      testConnection: '🔌 测试连接',
      save: '保存',
      cancel: '取消',
      testing: '⏳ 正在测试连接...',
      connecting: '⏳ 正在连接到',
      connected: '✅ 已连接到',
      connectFailed: '❌ 连接失败',
      configSaved: '✅ SSH 配置已保存',
      configDeleted: '🗑️ SSH 配置已删除',
      saveFailed: '❌ 保存失败',
      deleteFailed: '❌ 删除失败',
      disconnected: '🔌 已断开连接',
      disconnectFailed: '❌ 断开失败',
      deleteConfirm: '确定要删除这个 SSH 连接配置吗？',
      fillRequired: '❌ 请填写名称、主机和用户名',
      fillKeyPath: '❌ 请填写私钥路径',
      fillPassword: '❌ 请填写密码',
      fillHostUser: '❌ 请填写主机和用户名',
      testFailed: '❌ 测试失败'
    }
  },
  en: {
    theme: { dark: 'Dark', light: 'Light' },
    sidebar: {
      plans: '📋 Plans',
      loading: 'Loading plans...',
      loadingRemote: 'Loading remote plans...',
      empty: 'No plans yet. Switch Claude Code to plan mode to see plans here.',
      loadError: 'Load failed'
    },
    toolbar: {
      refresh: '⟳ Refresh',
      modified: 'Modified'
    },
    comments: {
      header: 'Comments',
      empty: 'No comments yet. Click the + button next to any section, or select text to add a review comment.',
      placeholder: 'Add a comment... (Ctrl+Enter to submit)',
      placeholderMac: 'Add a comment... (⌘+Enter to submit)',
      submit: 'Submit',
      cancel: 'Cancel',
      selectionTooltip: '💬 Comment on selection',
      added: '💬 Comment added & written to plan file',
      sectionPrefix: 'Section',
      goToHighlight: '↗ Go to highlight',
      goToSection: '↗ Go to section',
      commentCount: 'comment(s)',
      addComment: 'Add comment',
      leaveComment: 'Leave a comment...',
      addCommentBtn: 'Add Comment'
    },
    time: {
      justNow: 'just now',
      minutesAgo: 'm ago',
      hoursAgo: 'h ago',
      daysAgo: 'd ago'
    },
    emptyState: {
      title: 'Select a plan to review',
      desc: 'Choose a plan from the sidebar, or wait for Claude Code to generate one.'
    },
    commentType: {
      comment: 'comment',
      suggestion: 'suggestion',
      question: 'question',
      approve: 'approve',
      reject: 'reject'
    },
    panel: {
      title: '💬 Comments',
      toggleTitle: 'Toggle comment panel',
      evaluation: '📋 Plan Evaluation',
      evalPlaceholder: 'Evaluate the overall plan...',
      evalAdded: '📋 Plan evaluation added',
      empty: 'No comments yet. Add comments in the content area and they will appear here.',
      ungrouped: 'Ungrouped'
    },
    styles: {
      presetLabel: 'Display Style',
      default: 'Default',
      compact: 'Compact',
      spacious: 'Spacious',
      academic: 'Academic',
      minimal: 'Minimal',
      customCssTitle: 'Custom CSS',
      customCssHint: 'Custom CSS overrides all presets. Changes apply immediately.',
      customCssSaved: '✅ Custom styles saved',
      customCssBtn: '{CSS}'
    },
    ssh: {
      addConnection: 'Add SSH Connection',
      editConnection: 'Edit SSH Connection',
      editConfig: '✏️ Edit Config',
      disconnect: '🔌 Disconnect',
      delete: '🗑️ Delete',
      displayName: 'Display Name',
      host: 'Host',
      username: 'Username',
      port: 'Port',
      authMethod: 'Auth Method',
      keyFile: 'Key File',
      password: 'Password',
      privateKeyPath: 'Private Key Path',
      keyPassphrase: 'Key Passphrase (optional)',
      remoteClaude: 'Remote .claude Directory',
      testConnection: '🔌 Test Connection',
      save: 'Save',
      cancel: 'Cancel',
      testing: '⏳ Testing connection...',
      connecting: '⏳ Connecting to',
      connected: '✅ Connected to',
      connectFailed: '❌ Connection failed',
      configSaved: '✅ SSH config saved',
      configDeleted: '🗑️ SSH config deleted',
      saveFailed: '❌ Save failed',
      deleteFailed: '❌ Delete failed',
      disconnected: '🔌 Disconnected',
      disconnectFailed: '❌ Disconnect failed',
      deleteConfirm: 'Are you sure you want to delete this SSH connection?',
      fillRequired: '❌ Please fill in name, host and username',
      fillKeyPath: '❌ Please fill in private key path',
      fillPassword: '❌ Please fill in password',
      fillHostUser: '❌ Please fill in host and username',
      testFailed: '❌ Test failed'
    }
  }
};

let _lang = localStorage.getItem('lang') || 'zh';
let _onChangeCallbacks = [];

/**
 * 获取当前语言
 */
export function getCurrentLang() {
  return _lang;
}

/**
 * 翻译函数 - 根据 key 路径获取当前语言的翻译文本
 * @param {string} key - 点分隔的翻译键，如 'comments.submit'
 * @returns {string} 翻译文本，未找到时返回 key
 */
export function t(key) {
  const dict = translations[_lang] || translations.zh;
  return key.split('.').reduce((obj, k) => obj?.[k], dict) ?? key;
}

/**
 * 注册语言切换回调
 */
export function onLangChange(callback) {
  _onChangeCallbacks.push(callback);
}

/**
 * 应用 i18n 到 DOM - 更新所有标记了 data-i18n 的元素
 */
export function applyI18n() {
  // 更新 textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // 更新 placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // 更新 title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  // 更新语言切换按钮标签
  const label = document.getElementById('langLabel');
  if (label) label.textContent = _lang === 'zh' ? 'EN' : '中';
}

/**
 * 切换语言（中 ↔ 英）
 */
export function toggleLang() {
  _lang = _lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('lang', _lang);
  applyI18n();
  _onChangeCallbacks.forEach(cb => cb());
}
