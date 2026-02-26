// ── 文本选区浮动提示组件 ────────────────────────────────

import { useState, useEffect, useRef } from 'preact/hooks';

interface SelectionTooltipProps {
  onComment: (selectedText: string) => void;
}

/**
 * 文本选区浮动提示
 *
 * 当用户在 Markdown 内容区域选中文本时，显示 "Comment" 按钮
 */
export function SelectionTooltip({ onComment }: SelectionTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const selectedTextRef = useRef('');

  useEffect(() => {
    function handleMouseUp() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setVisible(false);
        return;
      }

      const text = selection.toString().trim();

      // 确保选区在 markdown-pane 内
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const pane = (container instanceof Element ? container : container.parentElement)
        ?.closest('.markdown-pane');

      if (!pane) {
        setVisible(false);
        return;
      }

      selectedTextRef.current = text;

      const rect = range.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
      setVisible(true);
    }

    function handleMouseDown(e: MouseEvent) {
      // 点击 tooltip 之外隐藏
      const target = e.target as Element;
      if (!target.closest('.selection-tooltip')) {
        setVisible(false);
      }
    }

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  function handleClick(e: MouseEvent) {
    // 阻止冒泡，避免触发 document 的 click/mouseup 取消选区
    e.stopPropagation();
    e.preventDefault();
    if (selectedTextRef.current) {
      onComment(selectedTextRef.current);
      setVisible(false);
      // 注意：不要在这里 removeAllRanges()，因为 MarkdownViewer 需要据此计算弹窗坐标！
    }
  }

  return (
    <div
      class={`selection-tooltip ${visible ? 'visible' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
      onClick={handleClick}
    >
      💬 Comment
    </div>
  );
}
