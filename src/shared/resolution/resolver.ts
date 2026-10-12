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
import {
  loadTsconfigPathMappings,
  resolveTsconfigPathsCandidate,
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

function toResolved(reference: AssetReference, physicalUri: string): ResolvedAsset {
  return {
    physicalUri: normalizePath(physicalUri),
    originalSpecifier: reference.originalSpecifier,
    physicalSpecifier: reference.physicalSpecifier,
    kind: reference.kind,
    query: reference.query,
  };
}

async function getMappings(
  host: AssetResolverHost,
  importerPath: string,
  cache: ResolutionCache | undefined,
): Promise<TsconfigPathMappings | null> {
  const dir = dirname(normalizePath(importerPath));
  if (cache) {
    if (cache.configByImporterDir.has(dir)) {
      return cache.configByImporterDir.get(dir)!;
    }
  }
  const mappings = (await loadTsconfigPathMappings(host, importerPath)) ?? null;
  if (cache) {
    cache.configByImporterDir.set(dir, mappings);
  }
  return mappings;
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
    // Still populate resolution cache when provided
    if (opts.cache) {
      const mappings = await getMappings(host, importerPath, opts.cache);
      const key = resolutionCacheKey({
        importerPath,
        importerVersion: opts.importerVersion,
        physicalSpecifier,
        aliasesFp,
        configContentId: mappings?.contentId ?? '',
      });
      opts.cache.resolutions.set(key, resolved);
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
  // If tsconfig returned a candidate it already exists.
  const resolved =
    candidate && (await fileExists(host, candidate))
      ? toResolved(reference, candidate)
      : undefined;

  // For tsconfig, existence was already checked inside resolveTsconfigPathsCandidate.
  // Double-check is cheap and uniform.
  if (opts.cache) {
    const key = resolutionCacheKey({
      importerPath,
      importerVersion: opts.importerVersion,
      physicalSpecifier,
      aliasesFp,
      configContentId,
    });
    opts.cache.resolutions.set(key, resolved);
  }

  return resolved;
}
