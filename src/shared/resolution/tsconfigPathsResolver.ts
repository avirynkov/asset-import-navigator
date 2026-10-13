import type ts from 'typescript';
import type { AssetResolverHost } from '../model/resolvedAsset';
import { dirname, isRelativeSpecifier, joinPath, normalizePath, walkAncestors } from './pathUtils';
import { SyncHostAsyncError, unwrapSync } from './syncHost';
import { getTypeScript } from '../typescriptRuntime';

export interface TsconfigPathMappings {
  configPath: string;
  /** Stable id from config file bytes (+ extends chain paths). */
  contentId: string;
  baseUrl: string | undefined;
  /** Resolved absolute base directory for path targets. */
  baseUrlDir: string;
  paths: Record<string, string[]> | undefined;
}

async function hostFileExists(host: AssetResolverHost, uri: string): Promise<boolean> {
  return await host.fileExists(uri);
}

async function hostReadText(
  host: AssetResolverHost,
  uri: string,
): Promise<string | undefined> {
  if (!host.readFile) {
    return undefined;
  }
  try {
    const bytes = await host.readFile(uri);
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    // Missing / unreadable file → treat as absent (RES-06 / Mode A must not throw).
    return undefined;
  }
}

function isPackageExtends(spec: string): boolean {
  if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/')) {
    return false;
  }
  if (/^[A-Za-z]:[\\/]/.test(spec)) {
    return false;
  }
  return true;
}

interface ParsedConfigJson {
  extends?: string | string[];
  compilerOptions?: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
}

async function loadConfigJson(
  host: AssetResolverHost,
  configPath: string,
): Promise<{ json: ParsedConfigJson; text: string } | undefined> {
  const text = await hostReadText(host, configPath);
  if (text === undefined) {
    return undefined;
  }
  const ts = getTypeScript();
  const parsed = ts.parseConfigFileTextToJson(configPath, text);
  if (parsed.error || !parsed.config || typeof parsed.config !== 'object') {
    return undefined;
  }
  return { json: parsed.config as ParsedConfigJson, text };
}

/**
 * Merge compilerOptions.baseUrl / paths along a relative/absolute file extends chain.
 * Package-name extends are skipped (Phase 2 out of scope) — that link is ignored.
 * baseUrlDir is absolute and resolved against the config file that declared baseUrl.
 */
async function mergeConfigOptions(
  host: AssetResolverHost,
  configPath: string,
  seen: Set<string>,
): Promise<{
  baseUrl: string | undefined;
  baseUrlDir: string | undefined;
  paths: Record<string, string[]> | undefined;
  contentParts: string[];
}> {
  const normalized = normalizePath(configPath);
  if (seen.has(normalized)) {
    return { baseUrl: undefined, baseUrlDir: undefined, paths: undefined, contentParts: [] };
  }
  seen.add(normalized);

  const loaded = await loadConfigJson(host, normalized);
  if (!loaded) {
    return { baseUrl: undefined, baseUrlDir: undefined, paths: undefined, contentParts: [] };
  }

  const contentParts = [`${normalized}:${loaded.text}`];
  let baseUrl: string | undefined;
  let baseUrlDir: string | undefined;
  let paths: Record<string, string[]> | undefined;
  const configDir = dirname(normalized);

  const extendsRaw = loaded.json.extends;
  const extendsList = extendsRaw === undefined
    ? []
    : Array.isArray(extendsRaw)
      ? extendsRaw
      : [extendsRaw];

  for (const ext of extendsList) {
    if (typeof ext !== 'string' || isPackageExtends(ext)) {
      continue;
    }
    const parentPath = normalizePath(
      ext.startsWith('/') || /^[A-Za-z]:[\\/]/.test(ext)
        ? ext
        : joinPath(configDir, ext),
    );
    let resolvedParent = parentPath;
    if (!(await hostFileExists(host, resolvedParent))) {
      const withJson = parentPath.endsWith('.json') ? parentPath : `${parentPath}.json`;
      if (await hostFileExists(host, withJson)) {
        resolvedParent = withJson;
      }
    }
    const parent = await mergeConfigOptions(host, resolvedParent, seen);
    contentParts.push(...parent.contentParts);
    if (parent.baseUrl !== undefined) {
      baseUrl = parent.baseUrl;
      baseUrlDir = parent.baseUrlDir;
    }
    if (parent.paths !== undefined) {
      paths = parent.paths;
    }
  }

  const opts = loaded.json.compilerOptions;
  if (opts?.baseUrl !== undefined) {
    baseUrl = opts.baseUrl;
    baseUrlDir = normalizePath(joinPath(configDir, opts.baseUrl));
  }
  if (opts?.paths !== undefined) {
    paths = opts.paths;
  }

  return { baseUrl, baseUrlDir, paths, contentParts };
}

export async function findNearestConfigPath(
  host: AssetResolverHost,
  importerPath: string,
): Promise<string | undefined> {
  for (const dir of walkAncestors(importerPath)) {
    const tsconfig = joinPath(dir, 'tsconfig.json');
    if (await hostFileExists(host, tsconfig)) {
      return tsconfig;
    }
    const jsconfig = joinPath(dir, 'jsconfig.json');
    if (await hostFileExists(host, jsconfig)) {
      return jsconfig;
    }
  }
  return undefined;
}

export async function loadTsconfigPathMappings(
  host: AssetResolverHost,
  importerPath: string,
): Promise<TsconfigPathMappings | undefined> {
  if (!host.readFile) {
    return undefined;
  }

  const configPath = await findNearestConfigPath(host, importerPath);
  if (!configPath) {
    return undefined;
  }

  const merged = await mergeConfigOptions(host, configPath, new Set());
  const configDir = dirname(configPath);
  // If baseUrl never set, path targets resolve relative to the nearest config dir (TS 4.1+).
  const baseUrlDir = merged.baseUrlDir ?? configDir;

  const contentId = simpleHash(merged.contentParts.join('\n'));

  return {
    configPath,
    contentId,
    baseUrl: merged.baseUrl,
    baseUrlDir,
    paths: merged.paths,
  };
}

function simpleHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

interface PatternMatch {
  pattern: string;
  starCapture: string | undefined;
}

/** TypeScript paths pattern selection: exact match, else longest prefix-before-*. */
export function matchPathsPattern(
  moduleName: string,
  paths: Record<string, string[]>,
): PatternMatch | undefined {
  let exact: string | undefined;
  let bestPattern: string | undefined;
  let bestPrefixLen = -1;
  let bestCapture: string | undefined;

  for (const pattern of Object.keys(paths)) {
    const star = pattern.indexOf('*');
    if (star === -1) {
      if (pattern === moduleName) {
        exact = pattern;
        break;
      }
      continue;
    }
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1);
    if (
      moduleName.length >= prefix.length + suffix.length &&
      moduleName.startsWith(prefix) &&
      moduleName.endsWith(suffix)
    ) {
      if (prefix.length > bestPrefixLen) {
        bestPrefixLen = prefix.length;
        bestPattern = pattern;
        bestCapture = moduleName.slice(prefix.length, moduleName.length - suffix.length);
      }
    }
  }

  if (exact !== undefined) {
    return { pattern: exact, starCapture: undefined };
  }
  if (bestPattern !== undefined) {
    return { pattern: bestPattern, starCapture: bestCapture };
  }
  return undefined;
}

function expandTarget(
  target: string,
  starCapture: string | undefined,
  baseUrlDir: string,
): string {
  let substituted = target;
  if (starCapture !== undefined) {
    substituted = target.replace(/\*/g, starCapture);
  }
  if (
    substituted.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(substituted)
  ) {
    return normalizePath(substituted);
  }
  return normalizePath(joinPath(baseUrlDir, substituted));
}

/**
 * Resolve a non-relative physical specifier via nearest tsconfig/jsconfig paths.
 * Tries targets in order; caller checks existence (or we check here — plan says first existing wins).
 */
export async function resolveTsconfigPathsCandidate(
  host: AssetResolverHost,
  physicalSpecifier: string,
  mappings: TsconfigPathMappings,
): Promise<string | undefined> {
  if (isRelativeSpecifier(physicalSpecifier)) {
    return undefined;
  }

  if (mappings.paths) {
    const matched = matchPathsPattern(physicalSpecifier, mappings.paths);
    if (matched) {
      const targets = mappings.paths[matched.pattern] ?? [];
      for (const target of targets) {
        const candidate = expandTarget(target, matched.starCapture, mappings.baseUrlDir);
        if (await hostFileExists(host, candidate)) {
          return candidate;
        }
      }
      // Pattern matched but no existing target — fall through to baseUrl fallback.
    }
  }

  // baseUrl fallback for non-relative names when baseUrl is set (RES-02).
  if (mappings.baseUrl !== undefined) {
    const candidate = normalizePath(joinPath(mappings.baseUrlDir, physicalSpecifier));
    if (await hostFileExists(host, candidate)) {
      return candidate;
    }
  }

  return undefined;
}

// --- Sync twins (Mode A / resolveAssetSync). Host must return sync values. ---

function hostFileExistsSync(host: AssetResolverHost, uri: string): boolean {
  return unwrapSync(host.fileExists(uri), 'fileExists');
}

function hostReadTextSync(host: AssetResolverHost, uri: string): string | undefined {
  if (!host.readFile) {
    return undefined;
  }
  try {
    const bytes = unwrapSync(host.readFile(uri), 'readFile');
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    // SyncHostAsyncError must still propagate for resolveAssetSync miss-as-delegate.
    if (err instanceof SyncHostAsyncError) {
      throw err;
    }
    // Missing / unreadable file → treat as absent.
    return undefined;
  }
}

function loadConfigJsonSync(
  host: AssetResolverHost,
  configPath: string,
): { json: ParsedConfigJson; text: string } | undefined {
  const text = hostReadTextSync(host, configPath);
  if (text === undefined) {
    return undefined;
  }
  const ts = getTypeScript();
  const parsed = ts.parseConfigFileTextToJson(configPath, text);
  if (parsed.error || !parsed.config || typeof parsed.config !== 'object') {
    return undefined;
  }
  return { json: parsed.config as ParsedConfigJson, text };
}

function mergeConfigOptionsSync(
  host: AssetResolverHost,
  configPath: string,
  seen: Set<string>,
): {
  baseUrl: string | undefined;
  baseUrlDir: string | undefined;
  paths: Record<string, string[]> | undefined;
  contentParts: string[];
} {
  const normalized = normalizePath(configPath);
  if (seen.has(normalized)) {
    return { baseUrl: undefined, baseUrlDir: undefined, paths: undefined, contentParts: [] };
  }
  seen.add(normalized);

  const loaded = loadConfigJsonSync(host, normalized);
  if (!loaded) {
    return { baseUrl: undefined, baseUrlDir: undefined, paths: undefined, contentParts: [] };
  }

  const contentParts = [`${normalized}:${loaded.text}`];
  let baseUrl: string | undefined;
  let baseUrlDir: string | undefined;
  let paths: Record<string, string[]> | undefined;
  const configDir = dirname(normalized);

  const extendsRaw = loaded.json.extends;
  const extendsList = extendsRaw === undefined
    ? []
    : Array.isArray(extendsRaw)
      ? extendsRaw
      : [extendsRaw];

  for (const ext of extendsList) {
    if (typeof ext !== 'string' || isPackageExtends(ext)) {
      continue;
    }
    const parentPath = normalizePath(
      ext.startsWith('/') || /^[A-Za-z]:[\\/]/.test(ext)
        ? ext
        : joinPath(configDir, ext),
    );
    let resolvedParent = parentPath;
    if (!hostFileExistsSync(host, resolvedParent)) {
      const withJson = parentPath.endsWith('.json') ? parentPath : `${parentPath}.json`;
      if (hostFileExistsSync(host, withJson)) {
        resolvedParent = withJson;
      }
    }
    const parent = mergeConfigOptionsSync(host, resolvedParent, seen);
    contentParts.push(...parent.contentParts);
    if (parent.baseUrl !== undefined) {
      baseUrl = parent.baseUrl;
      baseUrlDir = parent.baseUrlDir;
    }
    if (parent.paths !== undefined) {
      paths = parent.paths;
    }
  }

  const opts = loaded.json.compilerOptions;
  if (opts?.baseUrl !== undefined) {
    baseUrl = opts.baseUrl;
    baseUrlDir = normalizePath(joinPath(configDir, opts.baseUrl));
  }
  if (opts?.paths !== undefined) {
    paths = opts.paths;
  }

  return { baseUrl, baseUrlDir, paths, contentParts };
}

export function findNearestConfigPathSync(
  host: AssetResolverHost,
  importerPath: string,
): string | undefined {
  for (const dir of walkAncestors(importerPath)) {
    const tsconfig = joinPath(dir, 'tsconfig.json');
    if (hostFileExistsSync(host, tsconfig)) {
      return tsconfig;
    }
    const jsconfig = joinPath(dir, 'jsconfig.json');
    if (hostFileExistsSync(host, jsconfig)) {
      return jsconfig;
    }
  }
  return undefined;
}

export function loadTsconfigPathMappingsSync(
  host: AssetResolverHost,
  importerPath: string,
): TsconfigPathMappings | undefined {
  if (!host.readFile) {
    return undefined;
  }

  const configPath = findNearestConfigPathSync(host, importerPath);
  if (!configPath) {
    return undefined;
  }

  const merged = mergeConfigOptionsSync(host, configPath, new Set());
  const configDir = dirname(configPath);
  const baseUrlDir = merged.baseUrlDir ?? configDir;
  const contentId = simpleHash(merged.contentParts.join('\n'));

  return {
    configPath,
    contentId,
    baseUrl: merged.baseUrl,
    baseUrlDir,
    paths: merged.paths,
  };
}

export function resolveTsconfigPathsCandidateSync(
  host: AssetResolverHost,
  physicalSpecifier: string,
  mappings: TsconfigPathMappings,
): string | undefined {
  if (isRelativeSpecifier(physicalSpecifier)) {
    return undefined;
  }

  if (mappings.paths) {
    const matched = matchPathsPattern(physicalSpecifier, mappings.paths);
    if (matched) {
      const targets = mappings.paths[matched.pattern] ?? [];
      for (const target of targets) {
        const candidate = expandTarget(target, matched.starCapture, mappings.baseUrlDir);
        if (hostFileExistsSync(host, candidate)) {
          return candidate;
        }
      }
    }
  }

  if (mappings.baseUrl !== undefined) {
    const candidate = normalizePath(joinPath(mappings.baseUrlDir, physicalSpecifier));
    if (hostFileExistsSync(host, candidate)) {
      return candidate;
    }
  }

  return undefined;
}
