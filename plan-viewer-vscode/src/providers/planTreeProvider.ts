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
  /** 一次性折叠/展开覆盖状态，消费后重置为 null */
  private groupCollapsibleOverride: vscode.TreeItemCollapsibleState | null = null;

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

  /** 展开所有项目组 */
  expandAll(): void {
    this.groupCollapsibleOverride = vscode.TreeItemCollapsibleState.Expanded;
    this.refresh();
  }

  /** 折叠所有项目组 */
  collapseAll(): void {
    this.groupCollapsibleOverride = vscode.TreeItemCollapsibleState.Collapsed;
    this.refresh();
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

    // 消费折叠/展开覆盖状态（仅生效一次）
    const state = this.groupCollapsibleOverride ?? vscode.TreeItemCollapsibleState.Expanded;
    this.groupCollapsibleOverride = null;
    return groups.map(({ key, plans: groupPlans }) => new ProjectGroupItem(key, groupPlans, state));
  }
}
