import * as vscode from 'vscode';
import type { AssetResolverHost } from '../shared/model/resolvedAsset';
import { normalizePath } from '../shared/resolution/pathUtils';

/** Minimal FS surface for injection/tests (matches vscode.workspace.fs shape used here). */
export interface VscodeFileSystemLike {
  stat(uri: vscode.Uri): Thenable<vscode.FileStat>;
  readFile(uri: vscode.Uri): Thenable<Uint8Array>;
}

/**
 * Adapt VS Code `workspace.fs` into {@link AssetResolverHost}.
 * Shared resolver paths are absolute `/`-normalized filesystem paths; convert with `Uri.file`.
 */
export function createVscodeFileSystem(
  fs: VscodeFileSystemLike = vscode.workspace.fs,
): AssetResolverHost {
  return {
    async fileExists(uri: string): Promise<boolean> {
      try {
        await fs.stat(vscode.Uri.file(normalizePath(uri)));
        return true;
      } catch {
        return false;
      }
    },
    async readFile(uri: string): Promise<Uint8Array> {
      try {
        return await fs.readFile(vscode.Uri.file(normalizePath(uri)));
      } catch {
        throw new VscodeFileMissingError(uri);
      }
    },
  };
}

/** Thrown when vscode FS read fails; caught by shared text loaders → treat as absent. */
export class VscodeFileMissingError extends Error {
  constructor(uri: string) {
    super(`vscode readFile missing: ${uri}`);
    this.name = 'VscodeFileMissingError';
  }
}
