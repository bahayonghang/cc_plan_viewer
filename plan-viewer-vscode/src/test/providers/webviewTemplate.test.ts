import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('webview template', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/providers/webviewPanelManager.ts'),
    'utf8',
  );

  it('loads webview bundle as module script', () => {
    expect(source).toContain('<script nonce="${nonce}" type="module" src="${scriptUri}"></script>');
  });

  it('keeps nonce-based CSP script policy', () => {
    expect(source).toContain("script-src 'nonce-${nonce}';");
  });
});
