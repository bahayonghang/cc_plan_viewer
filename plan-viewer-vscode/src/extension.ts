// ── Plan Viewer 扩展入口 ─────────────────────────────────

import * as vscode from 'vscode';
import { PlanService } from './services/planService';
import { CommentService } from './services/commentService';
import { OpenSpecService } from './services/openspecService';
import { PlanTreeDataProvider, FilterDays } from './providers/planTreeProvider';
import { WebviewPanelManager } from './providers/webviewPanelManager';
import { FileWatcher } from './services/fileWatcher';
import type { SidebarMode } from './types';

let planService: PlanService;
let commentService: CommentService;
let openspecService: OpenSpecService;
let treeProvider: PlanTreeDataProvider;
let webviewManager: WebviewPanelManager;
let fileWatcher: FileWatcher;
let openspecWatcher: FileWatcher | undefined;

/** 更新 TreeView 描述显示当前模式/过滤状态 */
function updateTreeViewDescription(treeView: vscode.TreeView<vscode.TreeItem>) {
  treeView.description = treeProvider.getFilterLabel();
}

/** 更新 TreeView 标题 */
function updateTreeViewTitle(treeView: vscode.TreeView<vscode.TreeItem>) {
  treeView.title = treeProvider.getModeLabel();
  updateTreeViewDescription(treeView);
}

export function activate(context: vscode.ExtensionContext) {
  console.log('[Plan Viewer] 扩展已激活');

  // 初始化服务
  planService = new PlanService(context);
  commentService = new CommentService(context, planService);
  openspecService = new OpenSpecService();
  treeProvider = new PlanTreeDataProvider(planService, openspecService, context);
  webviewManager = new WebviewPanelManager(context, planService, commentService, openspecService);

  // 注册 TreeView
  const treeView = vscode.window.createTreeView('planViewer.planList', {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);

  // 初始显示标题和过滤状态
  updateTreeViewTitle(treeView);

  // 设置初始 context 变量
  vscode.commands.executeCommand('setContext', 'planViewer.mode', 'plans');

  // 文件监听器：自动刷新列表和 Webview
  fileWatcher = new FileWatcher([planService.getPlansDir()], async (uri, changeType) => {
    treeProvider.refresh();
    webviewManager.refreshCurrentPlan();

    // 当文件被修改时，检查是否需要提示清除评论
    if (changeType === 'change') {
      const currentPlanId = webviewManager.getCurrentPlanId();
      if (!currentPlanId) return;

      // 检查变更的文件是否是当前正在查看的 plan
      const planFileName = `${currentPlanId}.md`;
      if (!uri.fsPath.replace(/\\/g, '/').endsWith(planFileName)) return;

      // 检查该 plan 是否有评论
      const comments = planService.loadComments(currentPlanId);
      if (comments.length === 0) return;

      // 弹出提示
      const clearBtn = 'Clear Comments';
      const keepBtn = 'Keep';
      const choice = await vscode.window.showInformationMessage(
        'Plan file has been updated. Clear old comments?',
        clearBtn,
        keepBtn,
      );

      if (choice === clearBtn) {
        await commentService.clearAllComments(currentPlanId);
        await webviewManager.refreshCurrentPlan();
      }
    }
  });
  context.subscriptions.push(...fileWatcher.start());

  // OpenSpec 文件监听器
  const openspecDir = openspecService.getOpenSpecDir();
  if (openspecDir) {
    openspecWatcher = new FileWatcher([openspecDir], (_uri, _changeType) => {
      if (treeProvider.getMode() === 'openspec') {
        treeProvider.refresh();
      }
    });
    context.subscriptions.push(...openspecWatcher.start());
  }

  // 注册命令
  context.subscriptions.push(
    // 打开 Plan（点击 TreeView 项或命令面板）
    vscode.commands.registerCommand('planViewer.openPlan', async (planId: string) => {
      await webviewManager.openPlan(planId);
    }),

    // 打开 OpenSpec Artifact
    vscode.commands.registerCommand('planViewer.openArtifact', async (artifactPath: string) => {
      await webviewManager.openArtifact(artifactPath);
    }),

    // 模式切换
    vscode.commands.registerCommand('planViewer.switchMode', async () => {
      const current = treeProvider.getMode();
      const items: { label: string; value: SidebarMode; description?: string }[] = [
        {
          label: '$(markdown) Claude Plans',
          value: 'plans',
          description: current === 'plans' ? '✓ current' : undefined,
        },
        {
          label: '$(package) OpenSpec',
          value: 'openspec',
          description: current === 'openspec' ? '✓ current' : undefined,
        },
      ];

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Switch sidebar mode',
      });

      if (picked && picked.value !== current) {
        treeProvider.setMode(picked.value);
        vscode.commands.executeCommand('setContext', 'planViewer.mode', picked.value);
        updateTreeViewTitle(treeView);
      }
    }),

    // 刷新列表
    vscode.commands.registerCommand('planViewer.refresh', () => {
      treeProvider.refresh();
    }),

    // 在编辑器中打开 .md 文件
    vscode.commands.registerCommand('planViewer.openInEditor', async (item: unknown) => {
      const planItem = item as { plan?: { path?: string } } | undefined;
      if (planItem?.plan?.path) {
        const uri = vscode.Uri.file(planItem.plan.path);
        await vscode.commands.executeCommand('vscode.open', uri);
      }
    }),

    // 打开设置
    vscode.commands.registerCommand('planViewer.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'planViewer');
    }),

    // 时间过滤
    vscode.commands.registerCommand('planViewer.setTimeFilter', async () => {
      const current = treeProvider.getFilterDays();
      const options: { label: string; value: FilterDays; description?: string }[] = [
        { label: '$(calendar) Recent 3 days', value: 3 },
        { label: '$(calendar) Recent 7 days', value: 7 },
        { label: '$(calendar) Recent 30 days', value: 30 },
        { label: '$(list-unordered) All plans', value: 0 },
      ];
      // 标记当前选中项
      const items = options.map(opt => ({
        ...opt,
        description: opt.value === current ? '✓ current' : undefined,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select time range to show',
      });
      if (picked) {
        await treeProvider.setFilter(picked.value);
        updateTreeViewDescription(treeView);
      }
    }),
  );

  // 监听设置变更
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('planViewer')) {
        webviewManager.sendConfigUpdate();
      }
    }),
  );
}

export function deactivate() {
  webviewManager?.dispose();
  fileWatcher?.dispose();
  openspecWatcher?.dispose();
  console.log('[Plan Viewer] 扩展已停用');
}
