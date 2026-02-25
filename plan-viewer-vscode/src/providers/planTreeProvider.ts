// ── Plan 列表 TreeDataProvider ────────────────────────────

import * as vscode from 'vscode';
import { PlanService } from '../services/planService';
import { PlanTreeItem } from './planTreeItem';

/** 时间过滤选项（天数，0 = 全部） */
export type FilterDays = 3 | 7 | 30 | 0;

/** 过滤选项的显示标签 */
const FILTER_LABELS: Record<FilterDays, string> = {
  3: 'Recent 3d',
  7: 'Recent 7d',
  30: 'Recent 30d',
  0: 'All',
};

/**
 * 侧边栏 Plan 列表数据提供者
 */
export class PlanTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private filterDays: FilterDays;

  constructor(
    private readonly planService: PlanService,
    private readonly context: vscode.ExtensionContext,
  ) {
    const defaultDays = vscode.workspace.getConfiguration('planViewer').get<number>('defaultFilterDays', 3);
    const saved = context.workspaceState.get<FilterDays>('planViewer.filterDays');
    this.filterDays = saved ?? (defaultDays as FilterDays);
  }

  /** 获取当前过滤天数 */
  getFilterDays(): FilterDays {
    return this.filterDays;
  }

  /** 获取当前过滤标签 */
  getFilterLabel(): string {
    return FILTER_LABELS[this.filterDays];
  }

  /** 设置时间过滤 */
  async setFilter(days: FilterDays): Promise<void> {
    this.filterDays = days;
    await this.context.workspaceState.update('planViewer.filterDays', days);
    this.refresh();
  }

  /** 刷新列表 */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    // 叶节点：PlanTreeItem 没有子节点
    if (element instanceof PlanTreeItem) {
      return [];
    }

    // 顶层：获取 plan 列表并按时间过滤
    const plans = await this.planService.listPlans();

    if (this.filterDays === 0) {
      return plans.map(plan => new PlanTreeItem(plan));
    }

    const cutoff = Date.now() - this.filterDays * 24 * 60 * 60 * 1000;
    const filtered = plans.filter(plan => new Date(plan.modified).getTime() >= cutoff);
    return filtered.map(plan => new PlanTreeItem(plan));
  }
}
