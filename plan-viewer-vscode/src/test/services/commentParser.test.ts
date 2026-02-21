// ── commentParser 单元测试 ──────────────────────────────
import { describe, it, expect } from 'vitest';
import { parseCommentsFromPlan } from '../../services/commentParser';

describe('parseCommentsFromPlan', () => {
  it('应从 Markdown 中解析单个评论', () => {
    const content = `# Plan Title

Some content here.

## 📝 Review Comments

### 💬 COMMENT (re: "Architecture")

> This looks good

_— Reviewer, 2024/06/15 10:30_

`;
    const comments = parseCommentsFromPlan('test-plan', content);

    expect(comments).toHaveLength(1);
    expect(comments[0].type).toBe('comment');
    expect(comments[0].sectionTitle).toBe('Architecture');
    expect(comments[0].text).toBe('This looks good');
    expect(comments[0].planId).toBe('test-plan');
    expect(comments[0].createdAt).toBeTruthy();
  });

  it('应解析多个评论', () => {
    const content = `# Plan

### 💬 COMMENT

> First comment

_— Reviewer, 2024/06/15 10:30_

### 💡 SUGGESTION

> Second comment

_— Reviewer, 2024/06/15 11:00_

### ❓ QUESTION

> Third comment

_— Reviewer, 2024/06/15 11:30_

`;
    const comments = parseCommentsFromPlan('test-plan', content);

    expect(comments).toHaveLength(3);
    expect(comments[0].type).toBe('comment');
    expect(comments[1].type).toBe('suggestion');
    expect(comments[2].type).toBe('question');
  });

  it('应解析带选区文本的评论', () => {
    const content = `### 💬 COMMENT (on: "selected text here")

> My comment

_— Reviewer, 2024/06/15 10:30_

`;
    const comments = parseCommentsFromPlan('test-plan', content);

    expect(comments).toHaveLength(1);
    expect(comments[0].selectedText).toBe('selected text here');
    expect(comments[0].sectionTitle).toBe('');
  });

  it('应解析所有 5 种评论类型', () => {
    const types = [
      { emoji: '💬', type: 'comment' },
      { emoji: '💡', type: 'suggestion' },
      { emoji: '❓', type: 'question' },
      { emoji: '✅', type: 'approve' },
      { emoji: '❌', type: 'reject' },
    ];

    for (const { emoji, type } of types) {
      const content = `### ${emoji} ${type.toUpperCase()}

> Test text

_— Reviewer, 2024/06/15 10:30_

`;
      const comments = parseCommentsFromPlan('test-plan', content);
      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe(type);
    }
  });

  it('应忽略缺少时间戳的评论块', () => {
    const content = `### 💬 COMMENT

> No timestamp here

`;
    const comments = parseCommentsFromPlan('test-plan', content);
    expect(comments).toHaveLength(0);
  });

  it('应忽略缺少正文的评论块', () => {
    const content = `### 💬 COMMENT

_— Reviewer, 2024/06/15 10:30_

`;
    const comments = parseCommentsFromPlan('test-plan', content);
    expect(comments).toHaveLength(0);
  });

  it('应忽略非评论 h3 标题', () => {
    const content = `### Normal H3 Heading

Some regular content.

### 💬 COMMENT

> Real comment

_— Reviewer, 2024/06/15 10:30_

`;
    const comments = parseCommentsFromPlan('test-plan', content);
    expect(comments).toHaveLength(1);
  });

  it('应处理空内容', () => {
    const comments = parseCommentsFromPlan('test-plan', '');
    expect(comments).toHaveLength(0);
  });

  it('应解析多行评论文本', () => {
    const content = `### 💬 COMMENT

> Line one
> Line two
> Line three

_— Reviewer, 2024/06/15 10:30_

`;
    const comments = parseCommentsFromPlan('test-plan', content);
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe('Line one\nLine two\nLine three');
  });
});
