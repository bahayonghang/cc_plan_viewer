// ── Plan 列表 TreeDataProvider ────────────────────────────

import * as vscode from 'vscode';
import { PlanService } from '../services/planService';
import { PlanTreeItem } from './planTreeItem';
import type { PlanInfo } from '../types';

/**
 * 项目分组 TreeItem
 */
export class ProjectGroupItem extends vscode.TreeItem {
  public readonly plans: PlanInfo[];
  public readonly projectName: string;

  constructor(
    projectName: string,
    plans: PlanInfo[],
    state: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded,
  ) {
    const displayName = projectName || '(未分组)';
    super(displayName, state);

    // 稳定的 id 让 VSCode 能通过 treeView.reveal() 定位到该节点
    this.id = `group:${projectName || '__ungrouped__'}`;
    this.projectName = projectName;
    this.plans = plans;
    this.description = `${plans.length} 个计划`;
    this.iconPath = new vscode.ThemeIcon('folder');
    this.contextValue = 'projectGroup';
  }
}

/**
 * 侧边栏 Plan 列表数据提供者
 */
export class PlanTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private groupByProject: boolean;

  constructor(
    private readonly planService: PlanService,
    private readonly context: vscode.ExtensionContext,
  ) {
    this.groupByProject = context.workspaceState.get<boolean>('planViewer.groupByProject', true);
  }

  /** 刷新列表 */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /** 切换项目分组模式 */
  async toggleGrouping(): Promise<void> {
    this.groupByProject = !this.groupByProject;
    await this.context.workspaceState.update('planViewer.groupByProject', this.groupByProject);
    this.refresh();
  }

  /**
   * 展开所有项目组
   * 使用 treeView.reveal() 强制展开，可绕过 VSCode 的内部折叠状态缓存
   */
  async expandAll(treeView: vscode.TreeView<vscode.TreeItem>): Promise<void> {
    if (!this.groupByProject) return;
    const items = await this._buildGroupItems();
    for (const item of items) {
      try {
        await treeView.reveal(item, { expand: true, select: false, focus: false });
      } catch {
        // 节点不可见或树视图未激活时忽略错误
      }
    }
  }

  /**
   * 折叠所有项目组
   * 使用 VSCode 内置命令，可正确重置内部展开状态缓存
   */
  collapseAll(): void {
    vscode.commands.executeCommand('workbench.actions.treeView.planViewer.planList.collapseAll');
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    // 叶节点：PlanTreeItem 没有子节点
    if (element instanceof PlanTreeItem) {
      return [];
    }

    // 项目分组节点：返回该组内的 plan 列表（按 mtime 降序）
    if (element instanceof ProjectGroupItem) {
      return element.plans
        .slice()
        .sort((a, b) => b.modified.localeCompare(a.modified))
        .map(plan => new PlanTreeItem(plan));
    }

    // 顶层：根据分组模式返回
    const plans = await this.planService.listPlans();

    if (!this.groupByProject) {
      // 平铺模式
      return plans.map(plan => new PlanTreeItem(plan));
    }

    // 分组模式：按 project 字段聚合
    const groupMap = new Map<string, PlanInfo[]>();
    for (const plan of plans) {
      const key = plan.project;
      const group = groupMap.get(key);
      if (group) {
        group.push(plan);
      } else {
        groupMap.set(key, [plan]);
      }
    }

    // 构建分组数组，按组内最新 mtime 排序（有名称的组在前，未分组在后）
    const groups = Array.from(groupMap.entries()).map(([key, groupPlans]) => ({
      key,
      plans: groupPlans,
      latestMtime: groupPlans.reduce(
        (max, p) => (p.modified > max ? p.modified : max),
        '',
      ),
    }));

    groups.sort((a, b) => {
      // 未分组（空串）放最后
      if (!a.key && b.key) return 1;
      if (a.key && !b.key) return -1;
      // 同类按最新 mtime 降序
      return b.latestMtime.localeCompare(a.latestMtime);
    });

    return groups.map(({ key, plans: groupPlans }) => new ProjectGroupItem(key, groupPlans));
  }

  /**
   * 构建当前分组节点列表（供 expandAll 使用）
   * 由于节点带有稳定 id，VSCode 可通过 reveal() 匹配到树中对应节点
   */
  private async _buildGroupItems(): Promise<ProjectGroupItem[]> {
    const plans = await this.planService.listPlans();
    const groupMap = new Map<string, PlanInfo[]>();
    for (const plan of plans) {
      const key = plan.project;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(plan);
    }
    return Array.from(groupMap.entries()).map(
      ([key, groupPlans]) => new ProjectGroupItem(key, groupPlans, vscode.TreeItemCollapsibleState.Expanded),
    );
  }
}
