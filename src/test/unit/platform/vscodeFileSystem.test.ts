import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  Uri: {
    file: (p: string) => ({ fsPath: p, scheme: 'file', path: p }),
  },
  workspace: {
    fs: {
      stat: vi.fn(),
      readFile: vi.fn(),
    },
  },
}));

import {
  createVscodeFileSystem,
  VscodeFileMissingError,
} from '../../../platform/vscodeFileSystem';

describe('createVscodeFileSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fileExists returns true when stat succeeds', async () => {
    const fs = {
      stat: vi.fn(async () => ({ type: 1, ctime: 0, mtime: 0, size: 1 })),
      readFile: vi.fn(),
    };
    const host = createVscodeFileSystem(fs as never);
    await expect(host.fileExists('/proj/a.svg')).resolves.toBe(true);
    expect(fs.stat).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/proj/a.svg' }),
    );
  });

  it('fileExists returns false when stat throws', async () => {
    const fs = {
      stat: vi.fn(async () => {
        throw new Error('ENOENT');
      }),
      readFile: vi.fn(),
    };
    const host = createVscodeFileSystem(fs as never);
    await expect(host.fileExists('/missing.svg')).resolves.toBe(false);
  });

  it('readFile returns Uint8Array; miss throws VscodeFileMissingError', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fs = {
      stat: vi.fn(),
      readFile: vi
        .fn()
        .mockResolvedValueOnce(bytes)
        .mockRejectedValueOnce(new Error('ENOENT')),
    };
    const host = createVscodeFileSystem(fs as never);
    await expect(host.readFile!('/proj/a.svg')).resolves.toEqual(bytes);
    await expect(host.readFile!('/missing.svg')).rejects.toBeInstanceOf(
      VscodeFileMissingError,
    );
  });

  it('normalizes backslashes in paths before Uri.file', async () => {
    const fs = {
      stat: vi.fn(async () => ({ type: 1, ctime: 0, mtime: 0, size: 1 })),
      readFile: vi.fn(),
    };
    const host = createVscodeFileSystem(fs as never);
    await host.fileExists('\\proj\\a.svg');
    expect(fs.stat).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/proj/a.svg' }),
    );
  });
});
