// ── Plan Viewer 扩展入口 ─────────────────────────────────

import * as vscode from 'vscode';
import { PlanService } from './services/planService';
import { CommentService } from './services/commentService';
import { PlanTreeDataProvider } from './providers/planTreeProvider';
import { WebviewPanelManager } from './providers/webviewPanelManager';
import { FileWatcher } from './services/fileWatcher';

let planService: PlanService;
let commentService: CommentService;
let treeProvider: PlanTreeDataProvider;
let webviewManager: WebviewPanelManager;
let fileWatcher: FileWatcher;

export function activate(context: vscode.ExtensionContext) {
  console.log('[Plan Viewer] 扩展已激活');

  // 初始化服务
  planService = new PlanService(context);
  commentService = new CommentService(context, planService);
  treeProvider = new PlanTreeDataProvider(planService, context);
  webviewManager = new WebviewPanelManager(context, planService, commentService);

  // 注册 TreeView
  const treeView = vscode.window.createTreeView('planViewer.planList', {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);

  // 文件监听器：自动刷新列表和 Webview
  fileWatcher = new FileWatcher(planService.getPlansDir(), () => {
    treeProvider.refresh();
    webviewManager.refreshCurrentPlan();
  });
  context.subscriptions.push(...fileWatcher.start());

  // 注册命令
  context.subscriptions.push(
    // 打开 Plan（点击 TreeView 项或命令面板）
    vscode.commands.registerCommand('planViewer.openPlan', async (planId: string) => {
      await webviewManager.openPlan(planId);
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

    // 切换项目分组
    vscode.commands.registerCommand('planViewer.toggleGrouping', async () => {
      await treeProvider.toggleGrouping();
    }),

    // 展开所有项目组
    vscode.commands.registerCommand('planViewer.expandAll', () => {
      treeProvider.expandAll();
    }),

    // 折叠所有项目组
    vscode.commands.registerCommand('planViewer.collapseAll', () => {
      treeProvider.collapseAll();
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
  console.log('[Plan Viewer] 扩展已停用');
}
