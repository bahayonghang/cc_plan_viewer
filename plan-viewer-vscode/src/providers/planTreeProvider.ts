// ── Plan 列表 TreeDataProvider ────────────────────────────

import * as vscode from 'vscode';
import * as path from 'path';
import { PlanService } from '../services/planService';
import { OpenSpecService } from '../services/openspecService';
import { PlanTreeItem } from './planTreeItem';
import {
  OpenSpecGroupItem,
  OpenSpecChangeItem,
  OpenSpecArtifactItem,
  OpenSpecSpecDirItem,
} from './openspecTreeItem';
import type { SidebarMode, OpenSpecArtifactType } from '../types';

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
 * 侧边栏 Plan 列表数据提供者（双模式）
 *
 * 支持 Plans 和 OpenSpec 两种模式切换
 */
export class PlanTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private filterDays: FilterDays;
  private mode: SidebarMode = 'plans';

  constructor(
    private readonly planService: PlanService,
    private readonly openspecService: OpenSpecService,
    private readonly context: vscode.ExtensionContext,
  ) {
    const defaultDays = vscode.workspace.getConfiguration('planViewer').get<number>('defaultFilterDays', 3);
    const saved = context.workspaceState.get<FilterDays>('planViewer.filterDays');
    this.filterDays = saved ?? (defaultDays as FilterDays);
  }

  // ── 模式管理 ─────────────────────────────────────

  /** 获取当前模式 */
  getMode(): SidebarMode {
    return this.mode;
  }

  /** 切换模式 */
  setMode(mode: SidebarMode): void {
    this.mode = mode;
    this.refresh();
  }

  /** 获取模式显示标签 */
  getModeLabel(): string {
    return this.mode === 'plans' ? 'Plans' : 'OpenSpec';
  }

  // ── 过滤管理 ─────────────────────────────────────

  /** 获取当前过滤天数 */
  getFilterDays(): FilterDays {
    return this.filterDays;
  }

  /** 获取当前过滤标签 */
  getFilterLabel(): string {
    if (this.mode === 'openspec') return '';
    return FILTER_LABELS[this.filterDays];
  }

  /** 设置时间过滤 */
  async setFilter(days: FilterDays): Promise<void> {
    this.filterDays = days;
    await this.context.workspaceState.update('planViewer.filterDays', days);
    this.refresh();
  }

  // ── TreeDataProvider 接口 ─────────────────────────

  /** 刷新列表 */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (this.mode === 'openspec') {
      return this.getOpenSpecChildren(element);
    }
    return this.getPlanChildren(element);
  }

  // ── Plans 模式 ────────────────────────────────────

  private async getPlanChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element instanceof PlanTreeItem) {
      return [];
    }

    const plans = await this.planService.listPlans();

    if (this.filterDays === 0) {
      return plans.map(plan => new PlanTreeItem(plan));
    }

    const cutoff = Date.now() - this.filterDays * 24 * 60 * 60 * 1000;
    const filtered = plans.filter(plan => new Date(plan.modified).getTime() >= cutoff);
    return filtered.map(plan => new PlanTreeItem(plan));
  }

  // ── OpenSpec 模式 ─────────────────────────────────

  private async getOpenSpecChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    // 顶层：三个分组
    if (!element) {
      const [changes, archived, specs] = await Promise.all([
        this.openspecService.listChanges(),
        this.openspecService.listArchivedChanges(),
        this.openspecService.listSpecs(),
      ]);

      const groups: vscode.TreeItem[] = [];
      groups.push(new OpenSpecGroupItem('changes', changes.length));
      groups.push(new OpenSpecGroupItem('specs', specs.length));
      if (archived.length > 0) {
        groups.push(new OpenSpecGroupItem('archive', archived.length));
      }
      return groups;
    }

    // 分组节点 → 列出子项
    if (element instanceof OpenSpecGroupItem) {
      return this.getGroupChildren(element);
    }

    // 变更节点 → 列出 artifacts
    if (element instanceof OpenSpecChangeItem) {
      return this.getChangeChildren(element);
    }

    // 规格目录节点 → 列出文件
    if (element instanceof OpenSpecSpecDirItem) {
      return this.getSpecDirChildren(element);
    }

    return [];
  }

  private async getGroupChildren(group: OpenSpecGroupItem): Promise<vscode.TreeItem[]> {
    switch (group.groupType) {
      case 'changes': {
        const changes = await this.openspecService.listChanges();
        return changes.map(c => new OpenSpecChangeItem(c));
      }
      case 'specs': {
        const specs = await this.openspecService.listSpecs();
        return specs.map(s => new OpenSpecSpecDirItem(s.name, s.path, s.files));
      }
      case 'archive': {
        const archived = await this.openspecService.listArchivedChanges();
        return archived.map(c => new OpenSpecChangeItem(c));
      }
      default:
        return [];
    }
  }

  private async getChangeChildren(change: OpenSpecChangeItem): Promise<vscode.TreeItem[]> {
    const artifacts = await this.openspecService.listArtifacts(
      change.change.path,
      change.change.id,
    );
    return artifacts.map(a => {
      const progress = a.type === 'tasks' ? change.change.taskProgress : undefined;
      return new OpenSpecArtifactItem(a, progress);
    });
  }

  private async getSpecDirChildren(specDir: OpenSpecSpecDirItem): Promise<vscode.TreeItem[]> {
    return specDir.files.map(fileName => {
      const filePath = path.join(specDir.specPath, fileName);
      return new OpenSpecArtifactItem(
        {
          name: fileName,
          path: filePath,
          changeId: '',
          modified: new Date().toISOString(),
          type: 'spec' as OpenSpecArtifactType,
        },
      );
    });
  }
}
