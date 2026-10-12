import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AssetReference } from '../../../shared/model/assetReference';
import type { AssetResolverHost } from '../../../shared/model/resolvedAsset';
import { normalizePath } from '../../../shared/resolution/pathUtils';

export function fixturesRoot(...parts: string[]): string {
  return normalizePath(path.resolve(__dirname, '../../fixtures', ...parts));
}

/** Host backed by real fixture files on disk (tests only). */
export function createFsHost(): AssetResolverHost {
  return {
    fileExists(uri: string): boolean {
      const p = path.normalize(uri);
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
      } catch {
        return false;
      }
    },
    readFile(uri: string): Uint8Array {
      return new Uint8Array(fs.readFileSync(path.normalize(uri)));
    },
  };
}

/** In-memory host for pure unit tests. */
export function createMemoryHost(files: Record<string, string>): AssetResolverHost {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(files)) {
    map.set(normalizePath(k), v);
  }
  return {
    fileExists(uri: string): boolean {
      return map.has(normalizePath(uri));
    },
    readFile(uri: string): Uint8Array {
      const text = map.get(normalizePath(uri));
      if (text === undefined) {
        throw new Error(`missing file: ${uri}`);
      }
      return new TextEncoder().encode(text);
    },
  };
}

export function ref(
  partial: Partial<AssetReference> & Pick<AssetReference, 'physicalSpecifier' | 'kind'>,
): AssetReference {
  return {
    originalSpecifier: partial.originalSpecifier ?? partial.physicalSpecifier,
    physicalSpecifier: partial.physicalSpecifier,
    query: partial.query ?? null,
    hash: partial.hash ?? null,
    kind: partial.kind,
    sourceStart: partial.sourceStart ?? 0,
    sourceEnd: partial.sourceEnd ?? 0,
    symbolRanges: partial.symbolRanges ?? [],
  };
}
