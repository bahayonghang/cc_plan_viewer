// ── commentSync 单元测试 ────────────────────────────────
import { describe, it, expect } from 'vitest';
import { syncCommentsWithPlan } from '../../services/commentSync';
import { buildCommentBlock } from '../../services/commentBuilder';
import type { Comment } from '../../types';

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-test-001',
    planId: 'test-plan',
    lineNumber: null,
    lineContent: '',
    sectionTitle: '',
    selectedText: '',
    text: 'Test comment',
    type: 'comment',
    status: 'pending',
    createdAt: '2024-06-15T10:30:00.000Z',
    ...overrides,
  };
}

describe('syncCommentsWithPlan', () => {
  it('应保留同时存在于 JSON 和 Plan 内容中的评论', () => {
    const comment = makeComment();
    const block = buildCommentBlock(comment);
    const content = `# Plan\n\n## 📝 Review Comments\n\n${block}`;

    const { comments, changed } = syncCommentsWithPlan('test-plan', content, [comment]);

    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe('comment-test-001');
    expect(changed).toBe(false);
  });

  it('应移除不再存在于 Plan 内容中的评论', () => {
    const comment = makeComment();
    const content = '# Plan\n\nNo comments here.';

    const { comments, changed } = syncCommentsWithPlan('test-plan', content, [comment]);

    expect(comments).toHaveLength(0);
    expect(changed).toBe(true);
  });

  it('应从 Plan 内容中发现新评论', () => {
    const content = `# Plan

## 📝 Review Comments

### 💬 COMMENT

> New comment from plan

_— Reviewer, 2024/06/15 10:30_

`;
    const { comments, changed } = syncCommentsWithPlan('test-plan', content, []);

    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe('New comment from plan');
    expect(changed).toBe(true);
  });

  it('不应重复添加已存在的评论', () => {
    const comment = makeComment();
    const block = buildCommentBlock(comment);
    const content = `# Plan\n\n## 📝 Review Comments\n\n${block}`;

    const { comments } = syncCommentsWithPlan('test-plan', content, [comment]);

    // 不应出现重复
    expect(comments).toHaveLength(1);
  });

  it('应处理空评论列表和空内容', () => {
    const { comments, changed } = syncCommentsWithPlan('test-plan', '', []);

    expect(comments).toHaveLength(0);
    expect(changed).toBe(false);
  });

  it('应处理混合场景：保留、移除、发现', () => {
    const kept = makeComment({ id: 'keep-001', text: 'Kept comment' });
    const removed = makeComment({ id: 'remove-001', text: 'Removed comment' });

    const keptBlock = buildCommentBlock(kept);

    const content = `# Plan

## 📝 Review Comments

${keptBlock}### 💡 SUGGESTION

> New discovered comment

_— Reviewer, 2024/06/15 12:00_

`;

    const { comments, changed } = syncCommentsWithPlan('test-plan', content, [kept, removed]);

    expect(comments).toHaveLength(2);
    // 数量未变（2→2），虽然组成不同，但 changed 基于数量比较（与 Rust 实现一致）
    expect(changed).toBe(false);

    // 保留的评论
    const keptResult = comments.find(c => c.id === 'keep-001');
    expect(keptResult).toBeTruthy();
    expect(keptResult!.text).toBe('Kept comment');

    // 新发现的评论
    const discovered = comments.find(c => c.text === 'New discovered comment');
    expect(discovered).toBeTruthy();
    expect(discovered!.type).toBe('suggestion');

    // 移除的评论
    const removedResult = comments.find(c => c.id === 'remove-001');
    expect(removedResult).toBeUndefined();
  });
});
