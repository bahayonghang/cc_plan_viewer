// ── WebviewPanel 生命周期管理器 ───────────────────────────

import * as vscode from 'vscode';
import * as path from 'path';
import { PlanService } from '../services/planService';
import { CommentService } from '../services/commentService';
import { OpenSpecService } from '../services/openspecService';
import type { WebviewToExtensionMessage, WebviewConfig } from '../webview/lib/messageProtocol';
import type { Plan } from '../types';

/**
 * Webview 面板管理器
 *
 * 负责:
 * - 创建/复用 WebviewPanel（单例模式）
 * - CSP 配置和资源 URI 映射
 * - Extension ↔ Webview 消息路由
 * - Plan 和 OpenSpec Artifact 的渲染
 */
export class WebviewPanelManager {
  private panel: vscode.WebviewPanel | undefined;
  private currentPlanId: string | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly planService: PlanService,
    private readonly commentService: CommentService,
    private readonly openspecService: OpenSpecService,
  ) { }

  /** 当前面板是否可见 */
  get isVisible(): boolean {
    return this.panel?.visible ?? false;
  }

  /** 获取当前正在查看的 planId */
  getCurrentPlanId(): string | undefined {
    return this.currentPlanId;
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

  /** 打开 OpenSpec Artifact */
  async openArtifact(artifactPath: string): Promise<void> {
    const content = await this.openspecService.getArtifact(artifactPath);
    if (!content) {
      vscode.window.showWarningMessage(`Artifact not found: ${artifactPath}`);
      return;
    }

    const fileName = path.basename(artifactPath);
    // 推断 changeId：从路径中提取
    const changeId = this.extractChangeId(artifactPath);
    // 推断 artifactType
    const typeMap: Record<string, string> = {
      'proposal.md': 'proposal',
      'design.md': 'design',
      'tasks.md': 'tasks',
    };
    const artifactType = typeMap[fileName] ?? 'spec';

    this.currentPlanId = undefined;

    const artifact = { name: fileName, path: artifactPath, content, changeId, artifactType };

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      this.panel.title = `📦 ${changeId ? `${changeId}/${fileName}` : fileName}`;
      this.panel.webview.postMessage({ type: 'loadArtifact', artifact });
    } else {
      // 首次创建面板时用空 plan 初始化，然后发送 artifact
      const emptyPlan: Plan = {
        id: '__artifact__',
        name: fileName,
        path: artifactPath,
        content: '',
        modified: new Date().toISOString(),
        comments: [],
      };
      this.panel = this.createPanel(emptyPlan);
      this.panel.title = `📦 ${changeId ? `${changeId}/${fileName}` : fileName}`;
      // 面板创建后立即发送 artifact
      setTimeout(() => {
        this.panel?.webview.postMessage({ type: 'loadArtifact', artifact });
      }, 100);
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

      case 'updateComment': {
        const updated = await this.commentService.updateComment(
          msg.planId,
          msg.commentId,
          msg.text,
          msg.commentType,
        );
        if (updated) {
          this.panel?.webview.postMessage({
            type: 'commentUpdated',
            comment: updated,
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

      case 'openArtifact': {
        await this.openArtifact(msg.artifactPath);
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

      case 'clearComments': {
        const confirmBtn = 'Clear All';
        const answer = await vscode.window.showWarningMessage(
          'Are you sure you want to clear all comments for this plan?',
          { modal: true },
          confirmBtn,
        );
        if (answer === confirmBtn) {
          await this.commentService.clearAllComments(msg.planId);
          this.panel?.webview.postMessage({ type: 'commentsCleared' });
        }
        break;
      }
    }
  }

  /** 从 artifact 路径提取 changeId */
  private extractChangeId(artifactPath: string): string {
    // 路径形如 .../openspec/changes/<changeId>/proposal.md
    const parts = artifactPath.replace(/\\/g, '/').split('/');
    const changesIdx = parts.indexOf('changes');
    if (changesIdx >= 0 && changesIdx + 1 < parts.length) {
      return parts[changesIdx + 1];
    }
    return '';
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
    script-src 'nonce-${nonce}';
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
