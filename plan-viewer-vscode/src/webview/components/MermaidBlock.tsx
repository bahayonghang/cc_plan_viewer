// ── Mermaid 图表懒渲染组件 ───────────────────────────────

import { useEffect, useRef, useState } from 'preact/hooks';

interface MermaidBlockProps {
  code: string;
}

/**
 * Mermaid 图表组件
 *
 * 懒加载 mermaid 库，根据 VSCode 主题自动切换暗/亮
 */
export function MermaidBlock({ code }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;

        // 检测暗色/亮色主题
        const isDark = document.body.classList.contains('vscode-dark') ||
                       document.body.classList.contains('vscode-high-contrast');

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'strict',
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) {
          setError(`Mermaid render error: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div class="mermaid-container" style={{ color: 'var(--accent-red)', textAlign: 'left' }}>
        <pre style={{ fontSize: '0.8rem' }}>{error}</pre>
        <pre style={{ fontSize: '0.8rem', opacity: 0.5 }}>{code}</pre>
      </div>
    );
  }

  return <div class="mermaid-container" ref={containerRef} />;
}
