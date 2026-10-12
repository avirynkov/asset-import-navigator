import type { AssetResolverHost } from '../shared/model/resolvedAsset';
import { normalizePath } from '../shared/resolution/pathUtils';

/**
 * Minimal FS surface expected from tsserver `ServerHost` (sync).
 * Kept platform-local so shared code never imports tsserverlibrary.
 */
export interface TsserverHostLike {
  fileExists(path: string): boolean;
  readFile(path: string): string | undefined;
}

/**
 * Adapt a tsserver-like host into {@link AssetResolverHost}.
 * Paths are normalized to absolute `/`-form for the shared resolver.
 */
export function createTsserverFileSystem(serverHost: TsserverHostLike): AssetResolverHost {
  return {
    fileExists(uri: string): boolean {
      return serverHost.fileExists(normalizePath(uri));
    },
    readFile(uri: string): Uint8Array {
      const text = serverHost.readFile(normalizePath(uri));
      if (text === undefined) {
        // Signal missing to hostReadText* (caught → treat as absent). Never throw
        // uncaught into LS definition methods.
        throw new TsserverFileMissingError(uri);
      }
      return new TextEncoder().encode(text);
    },
  };
}

/** Thrown when tsserver `readFile` returns undefined; caught by sync/async text loaders. */
export class TsserverFileMissingError extends Error {
  constructor(uri: string) {
    super(`tsserver readFile missing: ${uri}`);
    this.name = 'TsserverFileMissingError';
  }
}
