import { describe, it, expect, vi } from 'vitest';

// Mock vscode API for tests
vi.mock('vscode', () => {
    return {
        workspace: {
            getConfiguration: () => ({ get: () => '' }),
            workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
            fs: {
                readDirectory: vi.fn(),
                stat: vi.fn(),
                readFile: vi.fn(),
            }
        },
        Uri: { file: (path: string) => ({ fsPath: path }) },
        FileType: { File: 1, Directory: 2, SymbolLink: 64 }
    };
});

import { OpenSpecService } from '../../services/openspecService';


describe('OpenSpecService', () => {
    const service = new OpenSpecService();

    describe('parseTaskProgress', () => {
        it('should parse empty content', () => {
            const result = service.parseTaskProgress('');
            expect(result).toEqual({ done: 0, total: 0 });
        });

        it('should parse completed tasks', () => {
            const content = `
        - [x] Task 1
        - [X] Task 2
        -[x] Task 3
      `;
            const result = service.parseTaskProgress(content);
            expect(result).toEqual({ done: 3, total: 3 });
        });

        it('should parse pending tasks', () => {
            const content = `
        - [ ] Task 1
        - [ ] Task 2
        -[ ] Task 3
      `;
            const result = service.parseTaskProgress(content);
            expect(result).toEqual({ done: 0, total: 3 });
        });

        it('should parse mixed tasks', () => {
            const content = `
        # Tasks
        - [x] Done task
        - [ ] Pending task 1
        Some text in between
        - [X] Another done
        - [ ] Pending task 2
      `;
            const result = service.parseTaskProgress(content);
            expect(result).toEqual({ done: 2, total: 4 });
        });

        it('should ignore non-task checkboxes', () => {
            const content = `
        This is a regular list:
        - Item 1
        - Item 2

        This is a task list:
        - [x] Done
        - [ ] Pending

        Just some text with [x] in it.
      `;
            const result = service.parseTaskProgress(content);
            expect(result).toEqual({ done: 1, total: 2 });
        });
    });
});
