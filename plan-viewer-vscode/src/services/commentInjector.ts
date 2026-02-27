// ── 评论注入/移除 ─────────────────────────────────────────
// 移植自 plan.rs:446-527

import type { Comment } from '../types';
import { REVIEW_MARKER, EMOJI_TO_TYPE } from '../constants';
import { buildCommentBlock } from './commentBuilder';

/**
 * 将评论注入到 Plan Markdown 内容中
 *
 * 策略:
 * - 有 selectedText: 在选中文本所在段落之后插入
 * - 无 selectedText: 追加到 Review Comments 区域底部
 *
 * @returns 注入后的新内容
 */
export function injectCommentIntoContent(content: string, comment: Comment): string {
  const block = buildCommentBlock(comment);
  let result = content;

  if (comment.selectedText) {
    // 在选区文本后的段落间插入
    const pos = result.indexOf(comment.selectedText);
    if (pos !== -1) {
      const endOfMatch = pos + comment.selectedText.length;
      const rest = result.slice(endOfMatch);
      const nextBlank = rest.indexOf('\n\n');

      const insertPos = nextBlank !== -1
        ? endOfMatch + nextBlank
        : result.length;

      result = `${result.slice(0, insertPos)}\n\n${block}${result.slice(insertPos)}`;
    } else {
      // 回退: 选区文本未找到，追加到底部
      result = appendCommentToBottom(result, block);
    }
  } else {
    // Section 级别评论: 追加到底部
    result = appendCommentToBottom(result, block);
  }

  return result;
}

/**
 * 从 Plan Markdown 内容中移除评论
 *
 * @returns 移除后的新内容
 */
export function removeCommentFromContent(content: string, comment: Comment): string {
  const block = buildCommentBlock(comment);

  // 替换评论块为空行
  let result = content.replace(block, '\n\n');

  // 清理空的 Review Comments 区域
  if (result.includes(REVIEW_MARKER)) {
    const parts = result.split(REVIEW_MARKER);
    if (parts.length === 2 && parts[1].trim() === '') {
      result = parts[0].trimEnd();
    }
  }

  return result;
}

/**
 * 将评论块追加到 Review Comments 区域
 *
 * 如果已存在 Review Comments 标记，直接追加。
 * 否则先添加分隔线和标记，再追加。
 */
function appendCommentToBottom(content: string, block: string): string {
  let result = content;

  if (result.includes(REVIEW_MARKER)) {
    result += block;
  } else {
    result += `\n\n---\n\n${REVIEW_MARKER}\n\n${block}`;
  }

  return result;
}

/**
 * 从 Plan Markdown 内容中移除所有评论块
 *
 * 策略:
 * - 逐行扫描，识别完整的评论块结构（header + 引用正文 + Reviewer 时间戳）
 * - 仅当三部分齐全时才判定为评论块并移除
 * - 不使用跨行正则，避免误匹配 plan 正文中碰巧以评论 emoji 开头的标题
 * - 移除空的 `## 📝 Review Comments` 区域（含前面的 `---` 分隔线）
 * - 清理多余空行
 *
 * @returns 清理后的内容
 */
export function removeAllCommentsFromContent(content: string): string {
  const emojis = new Set(Object.keys(EMOJI_TO_TYPE));
  const lines = content.split('\n');
  const linesToRemove = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检查是否是评论块标题: "### {emoji} TYPE..."
    if (!line.startsWith('### ')) continue;
    const afterPrefix = line.slice(4);
    const isCommentHeader = [...emojis].some(emoji => afterPrefix.startsWith(emoji));
    if (!isCommentHeader) continue;

    // 找到潜在的评论标题，向前扫描验证完整的评论块结构:
    // - 必须包含至少一行 "> " 引用文本
    // - 必须以 "_— Reviewer, ..._" 结尾
    // - 遇到另一个 "### " 标题则中止（非评论块）
    let hasQuotedLine = false;
    let reviewerLineIdx = -1;

    for (let j = i + 1; j < lines.length; j++) {
      const scanLine = lines[j];
      if (scanLine.startsWith('> ')) {
        hasQuotedLine = true;
      } else if (scanLine.startsWith('_— Reviewer,') && scanLine.endsWith('_')) {
        reviewerLineIdx = j;
        break;
      } else if (scanLine.startsWith('### ')) {
        // 遇到另一个标题，当前不是有效的评论块
        break;
      }
    }

    if (!hasQuotedLine || reviewerLineIdx === -1) continue;

    // 有效评论块 — 标记 header 到 reviewer 行之间的所有行
    for (let k = i; k <= reviewerLineIdx; k++) {
      linesToRemove.add(k);
    }
    // 标记 reviewer 行之后的尾部空行
    for (let k = reviewerLineIdx + 1; k < lines.length; k++) {
      if (lines[k].trim() === '') {
        linesToRemove.add(k);
      } else {
        break;
      }
    }
    // 标记 header 之前的前导空行
    for (let k = i - 1; k >= 0; k--) {
      if (lines[k].trim() === '') {
        linesToRemove.add(k);
      } else {
        break;
      }
    }
  }

  // 重建内容，排除被标记的行
  const kept = lines.filter((_, idx) => !linesToRemove.has(idx));
  let result = kept.join('\n');

  // 移除空的 Review Comments 区域（含前面的 --- 分隔线）
  const escapedMarker = REVIEW_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  result = result.replace(new RegExp(`\\n*---\\n+${escapedMarker}\\s*$`), '');
  result = result.replace(new RegExp(`\\n*${escapedMarker}\\s*$`), '');

  // 清理多余空行（3+ 连续换行 → 2）
  result = result.replace(/\n{3,}/g, '\n\n');

  // 修剪尾部空白，保留一个换行
  result = result.trimEnd() + '\n';

  return result;
}
