// ── WebviewPanel 生命周期管理器 ───────────────────────────

import * as vscode from 'vscode';
import * as path from 'path';
import { PlanService } from '../services/planService';
import { CommentService } from '../services/commentService';
import type { WebviewToExtensionMessage, WebviewConfig } from '../webview/lib/messageProtocol';
import type { Plan } from '../types';

/**
 * Webview 面板管理器
 *
 * 负责:
 * - 创建/复用 WebviewPanel（单例模式）
 * - CSP 配置和资源 URI 映射
 * - Extension ↔ Webview 消息路由
 */
export class WebviewPanelManager {
  private panel: vscode.WebviewPanel | undefined;
  private currentPlanId: string | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly planService: PlanService,
    private readonly commentService: CommentService,
  ) {}

  /** 当前面板是否可见 */
  get isVisible(): boolean {
    return this.panel?.visible ?? false;
  }

  /** 打开或聚焦 Plan Webview */
  async openPlan(planId: string): Promise<void> {
    const plan = await this.planService.getPlan(planId);
    if (!plan) {
      vscode.window.showWarningMessage(`Plan "${planId}" not found`);
      return;
    }

    this.currentPlanId = planId;

    if (this.panel) {
      // 复用已有面板：JS 已加载，直接 postMessage
      this.panel.reveal(vscode.ViewColumn.One);
      this.panel.title = `📋 ${plan.name}`;
      this.sendToPlan(plan);
    } else {
      // 首次创建：将初始数据注入 HTML，避免竞争条件
      this.panel = this.createPanel(plan);
      this.panel.title = `📋 ${plan.name}`;
    }
  }

  /** 刷新当前 Plan */
  async refreshCurrentPlan(): Promise<void> {
    if (!this.currentPlanId || !this.panel) return;
    await this.openPlan(this.currentPlanId);
  }

  /** 发送配置更新 */
  sendConfigUpdate(): void {
    if (!this.panel) return;
    this.panel.webview.postMessage({
      type: 'configChanged',
      config: this.getConfig(),
    });
  }

  /** 销毁面板 */
  dispose(): void {
    this.panel?.dispose();
    this.panel = undefined;
    this.currentPlanId = undefined;
  }

  // ── 内部方法 ────────────────────────────────────────

  private createPanel(initialPlan: Plan): vscode.WebviewPanel {
    const distWebviewPath = vscode.Uri.joinPath(this.context.extensionUri, 'dist-webview');

    const panel = vscode.window.createWebviewPanel(
      'planViewer.preview',
      'Plan Viewer',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [distWebviewPath],
      },
    );

    panel.webview.html = this.getHtml(panel.webview, initialPlan);

    // 处理来自 Webview 的消息
    panel.webview.onDidReceiveMessage(
      (msg: WebviewToExtensionMessage) => this.handleMessage(msg),
      undefined,
      this.context.subscriptions,
    );

    // 面板关闭时清理
    panel.onDidDispose(() => {
      this.panel = undefined;
      this.currentPlanId = undefined;
    });

    return panel;
  }

  private sendToPlan(plan: Plan): void {
    this.panel?.webview.postMessage({
      type: 'loadPlan',
      plan,
    });
  }

  private async handleMessage(msg: WebviewToExtensionMessage): Promise<void> {
    switch (msg.type) {
      case 'addComment': {
        const comment = await this.commentService.addComment(
          msg.planId,
          msg.commentData,
        );
        if (comment) {
          this.panel?.webview.postMessage({
            type: 'commentAdded',
            comment,
          });
        }
        break;
      }

      case 'deleteComment': {
        const ok = await this.commentService.deleteComment(
          msg.planId,
          msg.commentId,
        );
        if (ok) {
          this.panel?.webview.postMessage({
            type: 'commentDeleted',
            commentId: msg.commentId,
          });
        }
        break;
      }

      case 'openPlan': {
        await this.openPlan(msg.planId);
        break;
      }

      case 'openInEditor': {
        const planPath = path.join(
          this.planService.getPlansDir(),
          `${msg.planId}.md`,
        );
        const uri = vscode.Uri.file(planPath);
        await vscode.commands.executeCommand('vscode.open', uri);
        break;
      }

      case 'showToast': {
        vscode.window.showInformationMessage(msg.message);
        break;
      }

      case 'requestPlanList': {
        const plans = await this.planService.listPlans();
        this.panel?.webview.postMessage({
          type: 'planList',
          plans,
        });
        break;
      }
    }
  }

  private getConfig(): WebviewConfig {
    const config = vscode.workspace.getConfiguration('planViewer');
    return {
      fontSize: config.get<number>('fontSize', 14),
      lineHeight: config.get<number>('lineHeight', 1.7),
      embedCommentsInMarkdown: config.get<boolean>('embedCommentsInMarkdown', true),
    };
  }

  private getHtml(webview: vscode.Webview, initialPlan: Plan): string {
    const distWebviewUri = vscode.Uri.joinPath(this.context.extensionUri, 'dist-webview');

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distWebviewUri, 'main.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distWebviewUri, 'style.css'),
    );

    const nonce = getNonce();
    // 将初始 Plan 序列化注入 HTML，避免 postMessage 竞争条件
    // 需转义 </script> 防止 HTML 注入
    const safeJson = JSON.stringify(initialPlan).replace(/<\/script>/gi, '<\\/script>');

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src 'nonce-${nonce}' ${webview.cspSource};
    font-src ${webview.cspSource};
    img-src ${webview.cspSource} data:;
  ">
  <link rel="stylesheet" href="${styleUri}">
  <title>Plan Viewer</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">window.__INITIAL_PLAN__ = ${safeJson};</script>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

/** 生成 CSP nonce */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
