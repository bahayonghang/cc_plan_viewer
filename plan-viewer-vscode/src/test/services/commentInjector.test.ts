// ── commentInjector 单元测试 ────────────────────────────
import { describe, it, expect } from 'vitest';
import { injectCommentIntoContent, removeCommentFromContent } from '../../services/commentInjector';
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

describe('injectCommentIntoContent', () => {
  it('应为 section 级评论追加 Review Comments 区域', () => {
    const content = '# Plan\n\nSome content here.';
    const comment = makeComment();

    const result = injectCommentIntoContent(content, comment);

    expect(result).toContain('## 📝 Review Comments');
    expect(result).toContain('---');
    expect(result).toContain('### 💬 COMMENT');
    expect(result).toContain('> Test comment');
  });

  it('如果已有 Review Comments 区域，应直接追加', () => {
    const content = '# Plan\n\n## 📝 Review Comments\n\n';
    const comment = makeComment();

    const result = injectCommentIntoContent(content, comment);

    // 不应再次添加分隔线
    expect(result.match(/---/g)?.length ?? 0).toBe(0);
    expect(result).toContain('### 💬 COMMENT');
  });

  it('应将选区评论插入选中文本后方', () => {
    const content = 'First paragraph.\n\nSelected text here and more.\n\nThird paragraph.';
    const comment = makeComment({
      selectedText: 'Selected text here',
    });

    const result = injectCommentIntoContent(content, comment);

    // 评论应在 "Selected text here and more." 段落之后
    const commentPos = result.indexOf('### 💬 COMMENT');
    const selectedPos = result.indexOf('Selected text here');
    const thirdPos = result.indexOf('Third paragraph.');

    expect(commentPos).toBeGreaterThan(selectedPos);
    expect(thirdPos).toBeGreaterThan(commentPos);
  });

  it('选区文本未找到时应回退到底部', () => {
    const content = '# Plan\n\nSome content.';
    const comment = makeComment({
      selectedText: 'non-existent text',
    });

    const result = injectCommentIntoContent(content, comment);

    expect(result).toContain('## 📝 Review Comments');
    expect(result).toContain('### 💬 COMMENT');
  });
});

describe('removeCommentFromContent', () => {
  it('应移除评论块', () => {
    const comment = makeComment();
    const content = `# Plan\n\n## 📝 Review Comments\n\n### 💬 COMMENT\n\n> Test comment\n\n_— Reviewer, 2024/06/15 10:30_\n\n`;

    // 先注入再移除，验证幂等性
    const injected = injectCommentIntoContent('# Plan\n\nSome content.', comment);
    const removed = removeCommentFromContent(injected, comment);

    expect(removed).not.toContain('### 💬 COMMENT');
    expect(removed).not.toContain('> Test comment');
  });

  it('应清理空的 Review Comments 区域', () => {
    const comment = makeComment();

    // 创建只有一条评论的内容
    const injected = injectCommentIntoContent('# Plan\n\nContent.', comment);
    const removed = removeCommentFromContent(injected, comment);

    // 移除后不应保留空的 Review Comments 区域
    expect(removed).not.toContain('## 📝 Review Comments');
  });

  it('如果还有其他评论，应保留 Review Comments 区域', () => {
    const comment1 = makeComment({ text: 'First' });
    const comment2 = makeComment({ id: 'comment-002', text: 'Second' });

    let content = '# Plan\n\nContent.';
    content = injectCommentIntoContent(content, comment1);
    content = injectCommentIntoContent(content, comment2);

    const result = removeCommentFromContent(content, comment1);

    expect(result).toContain('## 📝 Review Comments');
    expect(result).toContain('> Second');
    expect(result).not.toContain('> First');
  });

  it('内容不包含评论时应保持不变', () => {
    const content = '# Plan\n\nContent.';
    const comment = makeComment();

    const result = removeCommentFromContent(content, comment);

    expect(result).toBe(content);
  });
});
