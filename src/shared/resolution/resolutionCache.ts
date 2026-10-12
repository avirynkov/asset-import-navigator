import type { ResolvedAsset } from '../model/resolvedAsset';
import type { TsconfigPathMappings } from './tsconfigPathsResolver';
import { normalizePath } from './pathUtils';

export interface ResolutionCache {
  /** Tier 1: importer directory → path mappings (or null if none). */
  configByImporterDir: Map<string, TsconfigPathMappings | null>;
  /** Tier 2: resolution results. */
  resolutions: Map<string, ResolvedAsset | undefined>;
}

export function createResolutionCache(): ResolutionCache {
  return {
    configByImporterDir: new Map(),
    resolutions: new Map(),
  };
}

export function aliasesFingerprint(aliases: Readonly<Record<string, string>>): string {
  return Object.keys(aliases)
    .sort()
    .map((k) => `${k}=${normalizePath(aliases[k]!)}`)
    .join('|');
}

export function resolutionCacheKey(parts: {
  importerPath: string;
  importerVersion: string | number;
  physicalSpecifier: string;
  aliasesFp: string;
  configContentId: string;
}): string {
  return [
    normalizePath(parts.importerPath),
    String(parts.importerVersion),
    parts.physicalSpecifier,
    parts.aliasesFp,
    parts.configContentId,
  ].join('\0');
}

/** B.11: document change — drop resolution entries for that importer path. */
export function invalidateOnDocumentChange(cache: ResolutionCache, documentPath: string): void {
  const n = normalizePath(documentPath);
  const prefix = n + '\0';
  for (const key of [...cache.resolutions.keys()]) {
    if (key.startsWith(prefix)) {
      cache.resolutions.delete(key);
    }
  }
}

/** B.11: tsconfig/jsconfig change — clear config + all resolutions. */
export function invalidateOnTsconfigChange(cache: ResolutionCache): void {
  cache.configByImporterDir.clear();
  cache.resolutions.clear();
}

/** B.11: extension config (aliases) change — clear resolutions (aliases in key). */
export function invalidateOnExtensionConfigChange(cache: ResolutionCache): void {
  cache.resolutions.clear();
}

/** B.11: asset file change — clear all resolutions (existence may change). */
export function invalidateOnAssetFileChange(cache: ResolutionCache): void {
  cache.resolutions.clear();
}

/** B.11: workspace folder change — clear everything. */
export function invalidateOnWorkspaceFolderChange(cache: ResolutionCache): void {
  cache.configByImporterDir.clear();
  cache.resolutions.clear();
}
