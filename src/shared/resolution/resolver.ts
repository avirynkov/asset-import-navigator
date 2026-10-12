import type { AssetReference } from '../model/assetReference';
import type { AssetResolverHost, ResolvedAsset } from '../model/resolvedAsset';
import { resolveConfiguredAliasCandidate } from './configuredAliasResolver';
import { dirname, isRelativeSpecifier, normalizePath } from './pathUtils';
import { resolveRelativeCandidate } from './relativeResolver';
import {
  aliasesFingerprint,
  createResolutionCache,
  resolutionCacheKey,
  type ResolutionCache,
} from './resolutionCache';
import { unwrapSync } from './syncHost';
import {
  loadTsconfigPathMappings,
  loadTsconfigPathMappingsSync,
  resolveTsconfigPathsCandidate,
  resolveTsconfigPathsCandidateSync,
  type TsconfigPathMappings,
} from './tsconfigPathsResolver';

export interface ResolveAssetOptions {
  reference: AssetReference;
  importerPath: string;
  importerVersion: string | number;
  aliases: Readonly<Record<string, string>>;
  host: AssetResolverHost;
  cache?: ResolutionCache;
}

export { createResolutionCache };
export type { ResolutionCache };

async function fileExists(host: AssetResolverHost, uri: string): Promise<boolean> {
  return await host.fileExists(uri);
}

function fileExistsSync(host: AssetResolverHost, uri: string): boolean {
  return unwrapSync(host.fileExists(uri), 'fileExists');
}

function toResolved(reference: AssetReference, physicalUri: string): ResolvedAsset {
  return {
    physicalUri: normalizePath(physicalUri),
    originalSpecifier: reference.originalSpecifier,
    physicalSpecifier: reference.physicalSpecifier,
    kind: reference.kind,
    query: reference.query,
  };
}

function contentIdOf(mappings: TsconfigPathMappings | null): string | null {
  return mappings?.contentId ?? null;
}

/**
 * Load tsconfig mappings, refreshing from disk when a cache is present so
 * contentId changes invalidate stale resolution entries (B.11 / Mode A).
 */
async function getMappings(
  host: AssetResolverHost,
  importerPath: string,
  cache: ResolutionCache | undefined,
): Promise<TsconfigPathMappings | null> {
  const dir = dirname(normalizePath(importerPath));
  const mappings = (await loadTsconfigPathMappings(host, importerPath)) ?? null;
  if (cache) {
    const prev = cache.configByImporterDir.get(dir);
    if (
      cache.configByImporterDir.has(dir) &&
      contentIdOf(prev ?? null) !== contentIdOf(mappings)
    ) {
      cache.resolutions.clear();
    }
    cache.configByImporterDir.set(dir, mappings);
  }
  return mappings;
}

function getMappingsSync(
  host: AssetResolverHost,
  importerPath: string,
  cache: ResolutionCache | undefined,
): TsconfigPathMappings | null {
  const dir = dirname(normalizePath(importerPath));
  const mappings = loadTsconfigPathMappingsSync(host, importerPath) ?? null;
  if (cache) {
    const prev = cache.configByImporterDir.get(dir);
    if (
      cache.configByImporterDir.has(dir) &&
      contentIdOf(prev ?? null) !== contentIdOf(mappings)
    ) {
      cache.resolutions.clear();
    }
    cache.configByImporterDir.set(dir, mappings);
  }
  return mappings;
}

/** Cache positive hits only — never sticky negative misses (asset may appear later). */
function cacheResolution(
  cache: ResolutionCache | undefined,
  key: string,
  resolved: ResolvedAsset | undefined,
): void {
  if (!cache || resolved === undefined) {
    return;
  }
  cache.resolutions.set(key, resolved);
}

/**
 * Resolve AssetReference → ResolvedAsset via relative → tsconfig/jsconfig → configured aliases.
 * Returns undefined if the physical file does not exist (RES-06).
 */
export async function resolveAsset(
  opts: ResolveAssetOptions,
): Promise<ResolvedAsset | undefined> {
  const { reference, host, aliases } = opts;
  const importerPath = normalizePath(opts.importerPath);

  if (reference.kind === 'unknown') {
    return undefined;
  }

  const physicalSpecifier = reference.physicalSpecifier;
  const aliasesFp = aliasesFingerprint(aliases);

  // Relative: terminal — no fall-through on miss
  if (isRelativeSpecifier(physicalSpecifier)) {
    const candidate = resolveRelativeCandidate(importerPath, physicalSpecifier);
    if (!candidate || !(await fileExists(host, candidate))) {
      return undefined;
    }
    const resolved = toResolved(reference, candidate);
    if (opts.cache) {
      const mappings = await getMappings(host, importerPath, opts.cache);
      const key = resolutionCacheKey({
        importerPath,
        importerVersion: opts.importerVersion,
        physicalSpecifier,
        aliasesFp,
        configContentId: mappings?.contentId ?? '',
      });
      cacheResolution(opts.cache, key, resolved);
    }
    return resolved;
  }

  const mappings = await getMappings(host, importerPath, opts.cache);
  const configContentId = mappings?.contentId ?? '';

  if (opts.cache) {
    const key = resolutionCacheKey({
      importerPath,
      importerVersion: opts.importerVersion,
      physicalSpecifier,
      aliasesFp,
      configContentId,
    });
    if (opts.cache.resolutions.has(key)) {
      return opts.cache.resolutions.get(key);
    }
  }

  let candidate: string | undefined;

  if (mappings) {
    candidate = await resolveTsconfigPathsCandidate(host, physicalSpecifier, mappings);
  }

  if (!candidate) {
    candidate = resolveConfiguredAliasCandidate(physicalSpecifier, aliases);
    if (candidate && !(await fileExists(host, candidate))) {
      candidate = undefined;
    }
  }

  // tsconfig stage already verified existence; alias stage checked above.
  const resolved =
    candidate && (await fileExists(host, candidate))
      ? toResolved(reference, candidate)
      : undefined;

  if (opts.cache) {
    const key = resolutionCacheKey({
      importerPath,
      importerVersion: opts.importerVersion,
      physicalSpecifier,
      aliasesFp,
      configContentId,
    });
    cacheResolution(opts.cache, key, resolved);
  }

  return resolved;
}

/**
 * Sync twin of {@link resolveAsset} for Mode A (tsserver LS APIs are synchronous).
 * Requires the host to return sync values from `fileExists` / `readFile`.
 * If the host returns a Promise, returns `undefined` (caller should delegate to original LS).
 */
export function resolveAssetSync(opts: ResolveAssetOptions): ResolvedAsset | undefined {
  try {
    return resolveAssetSyncInner(opts);
  } catch {
    // Mode A LS APIs are sync and must not throw (async host, missing readFile, etc.).
    return undefined;
  }
}

function resolveAssetSyncInner(opts: ResolveAssetOptions): ResolvedAsset | undefined {
  const { reference, host, aliases } = opts;
  const importerPath = normalizePath(opts.importerPath);

  if (reference.kind === 'unknown') {
    return undefined;
  }

  const physicalSpecifier = reference.physicalSpecifier;
  const aliasesFp = aliasesFingerprint(aliases);

  if (isRelativeSpecifier(physicalSpecifier)) {
    const candidate = resolveRelativeCandidate(importerPath, physicalSpecifier);
    if (!candidate || !fileExistsSync(host, candidate)) {
      return undefined;
    }
    const resolved = toResolved(reference, candidate);
    if (opts.cache) {
      const mappings = getMappingsSync(host, importerPath, opts.cache);
      const key = resolutionCacheKey({
        importerPath,
        importerVersion: opts.importerVersion,
        physicalSpecifier,
        aliasesFp,
        configContentId: mappings?.contentId ?? '',
      });
      cacheResolution(opts.cache, key, resolved);
    }
    return resolved;
  }

  const mappings = getMappingsSync(host, importerPath, opts.cache);
  const configContentId = mappings?.contentId ?? '';

  if (opts.cache) {
    const key = resolutionCacheKey({
      importerPath,
      importerVersion: opts.importerVersion,
      physicalSpecifier,
      aliasesFp,
      configContentId,
    });
    if (opts.cache.resolutions.has(key)) {
      return opts.cache.resolutions.get(key);
    }
  }

  let candidate: string | undefined;

  if (mappings) {
    candidate = resolveTsconfigPathsCandidateSync(host, physicalSpecifier, mappings);
  }

  if (!candidate) {
    candidate = resolveConfiguredAliasCandidate(physicalSpecifier, aliases);
    if (candidate && !fileExistsSync(host, candidate)) {
      candidate = undefined;
    }
  }

  const resolved =
    candidate && fileExistsSync(host, candidate)
      ? toResolved(reference, candidate)
      : undefined;

  if (opts.cache) {
    const key = resolutionCacheKey({
      importerPath,
      importerVersion: opts.importerVersion,
      physicalSpecifier,
      aliasesFp,
      configContentId,
    });
    cacheResolution(opts.cache, key, resolved);
  }

  return resolved;
}
