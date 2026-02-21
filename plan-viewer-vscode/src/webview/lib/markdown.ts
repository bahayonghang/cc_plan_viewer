// ── Markdown 渲染配置 ────────────────────────────────────
// 配置 marked + highlight.js（按需导入，仅注册常用语言）

import { marked, type TokenizerExtension, type RendererExtension } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';

// 按需导入常用语言（替代全量导入，大幅减小包体积）
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('css', css);
hljs.registerLanguage('go', go);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

// 配置 highlight.js 语法高亮
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch { /* 忽略高亮错误 */ }
      }
      return hljs.highlightAuto(code).value;
    },
  }),
);

// 配置 Mermaid 代码块特殊处理
const mermaidExtension: TokenizerExtension & RendererExtension = {
  name: 'mermaid',
  level: 'block',
  start(src: string) { return src.indexOf('```mermaid'); },
  tokenizer(src: string) {
    const match = src.match(/^```mermaid\n([\s\S]*?)```/);
    if (match) {
      return {
        type: 'mermaid',
        raw: match[0],
        text: match[1].trim(),
      };
    }
    return undefined;
  },
  renderer(token) {
    // 渲染为 Mermaid 容器，由 MermaidBlock 组件处理
    return `<div class="mermaid-container" data-mermaid="${encodeURIComponent(token.text)}"></div>`;
  },
};

marked.use({ extensions: [mermaidExtension] });

/**
 * 渲染 Markdown 为 HTML
 */
export function renderMarkdown(content: string): string {
  return marked.parse(content) as string;
}

/**
 * Section 分割算法
 * 移植自 app.js:706-727
 *
 * 将 rendered HTML 按 h1/h2/h3 拆分为 Section
 */
export interface MdSection {
  title: string;
  tag: string;
  html: string;
}

export function splitIntoSections(html: string): MdSection[] {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const sections: MdSection[] = [];
  let currentSection: { title: string; tag: string; elements: string[] } | null = null;

  for (const node of Array.from(tempDiv.childNodes)) {
    const el = node as Element;
    const tagName = el.tagName ? el.tagName.toLowerCase() : '';

    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      if (currentSection) {
        sections.push({
          title: currentSection.title,
          tag: currentSection.tag,
          html: currentSection.elements.join(''),
        });
      }
      currentSection = {
        title: el.textContent || '',
        tag: tagName,
        elements: [el.outerHTML],
      };
    } else if (currentSection) {
      currentSection.elements.push(el.outerHTML || el.textContent || '');
    } else {
      currentSection = { title: '', tag: '', elements: [el.outerHTML || el.textContent || ''] };
    }
  }

  if (currentSection) {
    sections.push({
      title: currentSection.title,
      tag: currentSection.tag,
      html: currentSection.elements.join(''),
    });
  }

  return sections;
}
