// ── commentBuilder 单元测试 ─────────────────────────────
import { describe, it, expect } from 'vitest';
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
    text: 'This is a test comment',
    type: 'comment',
    status: 'pending',
    createdAt: '2024-06-15T10:30:00.000Z',
    ...overrides,
  };
}

describe('buildCommentBlock', () => {
  it('应生成基本评论块', () => {
    const result = buildCommentBlock(makeComment());
    expect(result).toContain('### 💬 COMMENT');
    expect(result).toContain('> This is a test comment');
    expect(result).toContain('_— Reviewer,');
  });

  it('应对不同评论类型使用正确 emoji', () => {
    const types = [
      { type: 'comment' as const, emoji: '💬' },
      { type: 'suggestion' as const, emoji: '💡' },
      { type: 'question' as const, emoji: '❓' },
      { type: 'approve' as const, emoji: '✅' },
      { type: 'reject' as const, emoji: '❌' },
    ];

    for (const { type, emoji } of types) {
      const result = buildCommentBlock(makeComment({ type }));
      expect(result).toContain(`### ${emoji} ${type.toUpperCase()}`);
    }
  });

  it('应包含选区文本上下文 (on: "...")', () => {
    const result = buildCommentBlock(makeComment({
      selectedText: 'some selected text',
    }));
    expect(result).toContain('(on: "some selected text")');
  });

  it('应包含 section 标题上下文 (re: "...")', () => {
    const result = buildCommentBlock(makeComment({
      sectionTitle: 'Architecture',
    }));
    expect(result).toContain('(re: "Architecture")');
  });

  it('选区文本优先于 section 标题', () => {
    const result = buildCommentBlock(makeComment({
      selectedText: 'selected',
      sectionTitle: 'section',
    }));
    expect(result).toContain('(on: "selected")');
    expect(result).not.toContain('(re: "section")');
  });

  it('应截断过长的选区文本', () => {
    const longText = 'a'.repeat(100);
    const result = buildCommentBlock(makeComment({
      selectedText: longText,
    }));
    expect(result).toContain('a'.repeat(80) + '...');
  });

  it('应包含行号', () => {
    const result = buildCommentBlock(makeComment({
      lineNumber: 42,
    }));
    expect(result).toContain('[Line 42]');
  });

  it('应正确处理多行评论文本', () => {
    const result = buildCommentBlock(makeComment({
      text: 'Line one\nLine two\nLine three',
    }));
    expect(result).toContain('> Line one\n> Line two\n> Line three');
  });

  it('应格式化时间戳为 YYYY/MM/DD HH:MM', () => {
    const result = buildCommentBlock(makeComment({
      createdAt: '2024-06-15T10:30:00.000Z',
    }));
    // 时间戳会根据本地时区有偏移，但格式应正确
    expect(result).toMatch(/_— Reviewer, \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}_/);
  });
});
