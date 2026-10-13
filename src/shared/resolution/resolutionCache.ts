import type { ResolvedAsset } from '../model/resolvedAsset';
import type { TsconfigPathMappings } from './tsconfigPathsResolver';
import { normalizePath } from './pathUtils';

export interface ResolutionCache {
  /** Tier 1: importer directory → path mappings (or null if none). */
  configByImporterDir: Map<string, TsconfigPathMappings | null>;
  /** Tier 2: resolution results. */
  resolutions: Map<string, ResolvedAsset | undefined>;
  /**
   * Tier 2 index: importer → document versions (least → most recently used) →
   * resolution keys. Bounds growth per importer without scanning `resolutions`.
   */
  versionsByImporter: Map<string, Map<string, Set<string>>>;
}

/**
 * Versions kept per importer. Two (not one) so a slow request for an older
 * version that finishes late cannot evict the entries of the current one.
 */
const MAX_VERSIONS_PER_IMPORTER = 2;

export function createResolutionCache(): ResolutionCache {
  return {
    configByImporterDir: new Map(),
    resolutions: new Map(),
    versionsByImporter: new Map(),
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

/** Store a positive resolution and record it in the per-importer version index. */
export function storeResolution(
  cache: ResolutionCache,
  key: string,
  resolved: ResolvedAsset,
): void {
  cache.resolutions.set(key, resolved);
  touchResolution(cache, key).add(key);
}

/**
 * Mark the key's importer version as most recently used, evicting the least
 * recently used versions beyond MAX_VERSIONS_PER_IMPORTER. Returns the key set
 * of the touched version.
 */
export function touchResolution(cache: ResolutionCache, key: string): Set<string> {
  // Key layout: importer \0 version \0 … (see resolutionCacheKey).
  const [importer = '', version = ''] = key.split('\0', 2);
  let versions = cache.versionsByImporter.get(importer);
  if (!versions) {
    versions = new Map();
    cache.versionsByImporter.set(importer, versions);
  }
  const keys = versions.get(version) ?? new Set<string>();
  versions.delete(version);
  versions.set(version, keys);
  while (versions.size > MAX_VERSIONS_PER_IMPORTER) {
    const oldest = versions.entries().next().value;
    if (!oldest) {
      break;
    }
    versions.delete(oldest[0]);
    for (const stale of oldest[1]) {
      cache.resolutions.delete(stale);
    }
  }
  return keys;
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
  cache.versionsByImporter.delete(n);
}

/** B.11: tsconfig/jsconfig change — clear config + all resolutions. */
export function invalidateOnTsconfigChange(cache: ResolutionCache): void {
  cache.configByImporterDir.clear();
  cache.resolutions.clear();
  cache.versionsByImporter.clear();
}

/** B.11: extension config (aliases) change — clear resolutions (aliases in key). */
export function invalidateOnExtensionConfigChange(cache: ResolutionCache): void {
  cache.resolutions.clear();
  cache.versionsByImporter.clear();
}

/** B.11: asset file change — clear all resolutions (existence may change). */
export function invalidateOnAssetFileChange(cache: ResolutionCache): void {
  cache.resolutions.clear();
  cache.versionsByImporter.clear();
}

/** B.11: workspace folder change — clear everything. */
export function invalidateOnWorkspaceFolderChange(cache: ResolutionCache): void {
  cache.configByImporterDir.clear();
  cache.resolutions.clear();
  cache.versionsByImporter.clear();
}
