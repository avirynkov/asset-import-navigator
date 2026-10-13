import type ts from 'typescript';
import { findAssetReferenceAt } from '../shared/parser/assetReferenceDetector';
import type { AssetReference } from '../shared/model/assetReference';
import type {
  AssetResolverHost,
  ResolvedAsset,
} from '../shared/model/resolvedAsset';
import {
  createResolutionCache,
  resolveAsset,
  type ResolutionCache,
} from '../shared/resolution/resolver';
import { normalizePath } from '../shared/resolution/pathUtils';
import { isExtensionAllowed } from '../tsserver-plugin/configuration';
import { getTypeScript } from '../shared/typescriptRuntime';

export interface AssetNavTarget {
  /** Inclusive start offset in source text (module specifier range). */
  start: number;
  /** Exclusive end offset. */
  end: number;
  /** Absolute `/`-normalized filesystem path (ResolvedAsset.physicalUri). */
  targetPath: string;
}

export interface AssetHoverTarget {
  resolved: ResolvedAsset;
  /** Half-open range that contains `position` (specifier or symbol binding). */
  start: number;
  end: number;
}

export interface AssetNavCoreOptions {
  text: string;
  fileName: string;
  scriptKind: ts.ScriptKind;
  version: string | number;
  enabled: boolean;
  extensions: readonly string[];
  queryPolicySupported: boolean;
  aliases: Readonly<Record<string, string>>;
  host: AssetResolverHost;
  cache?: ResolutionCache;
}

/**
 * Collect document-link targets for supported asset module specifiers.
 * Pure helper — no vscode import (AC-4.1 / NAV-06 / NAV-07).
 */
export async function collectAssetDocumentLinks(
  opts: AssetNavCoreOptions,
): Promise<AssetNavTarget[]> {
  if (!opts.enabled || !opts.queryPolicySupported) {
    return [];
  }

  const ts = getTypeScript();
  const sourceFile = ts.createSourceFile(
    opts.fileName,
    opts.text,
    ts.ScriptTarget.Latest,
    true,
    opts.scriptKind,
  );

  const importerPath = normalizePath(opts.fileName);
  const cache = opts.cache;
  const out: AssetNavTarget[] = [];
  const seen = new Set<string>();

  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt) && !ts.isExportDeclaration(stmt)) {
      continue;
    }
    const spec = stmt.moduleSpecifier;
    if (!spec || !ts.isStringLiteralLike(spec)) {
      continue;
    }
    const pos = spec.getStart(sourceFile);
    const reference = findAssetReferenceAt(sourceFile, pos);
    if (!reference) {
      continue;
    }
    if (!isExtensionAllowed(reference.kind, opts.extensions)) {
      continue;
    }

    const resolved = await resolveAsset({
      reference,
      importerPath,
      importerVersion: opts.version,
      aliases: opts.aliases,
      host: opts.host,
      cache,
    });
    if (!resolved) {
      continue;
    }

    const key = `${reference.sourceStart}:${reference.sourceEnd}:${resolved.physicalUri}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({
      start: reference.sourceStart,
      end: reference.sourceEnd,
      targetPath: resolved.physicalUri,
    });
  }

  return out;
}

/**
 * Resolve a single definition target at `position` (asset positions only).
 * Returns undefined for non-assets / misses (NINT-01 / RES-06).
 */
export async function resolveAssetDefinitionAt(
  opts: AssetNavCoreOptions & { position: number },
): Promise<AssetNavTarget | undefined> {
  if (!opts.enabled || !opts.queryPolicySupported) {
    return undefined;
  }

  const ts = getTypeScript();
  const sourceFile = ts.createSourceFile(
    opts.fileName,
    opts.text,
    ts.ScriptTarget.Latest,
    true,
    opts.scriptKind,
  );

  const reference = findAssetReferenceAt(sourceFile, opts.position);
  if (!reference) {
    return undefined;
  }
  if (!isExtensionAllowed(reference.kind, opts.extensions)) {
    return undefined;
  }

  const resolved = await resolveAsset({
    reference,
    importerPath: normalizePath(opts.fileName),
    importerVersion: opts.version,
    aliases: opts.aliases,
    host: opts.host,
    cache: opts.cache,
  });
  if (!resolved) {
    return undefined;
  }

  return {
    start: reference.sourceStart,
    end: reference.sourceEnd,
    targetPath: resolved.physicalUri,
  };
}

/**
 * Resolve a hover target at `position` (asset positions only).
 * Returns the touching range (binding or specifier) for Hover highlighting.
 */
export async function resolveAssetHoverAt(
  opts: AssetNavCoreOptions & { position: number },
): Promise<AssetHoverTarget | undefined> {
  if (!opts.enabled || !opts.queryPolicySupported) {
    return undefined;
  }

  const ts = getTypeScript();
  const sourceFile = ts.createSourceFile(
    opts.fileName,
    opts.text,
    ts.ScriptTarget.Latest,
    true,
    opts.scriptKind,
  );

  const reference = findAssetReferenceAt(sourceFile, opts.position);
  if (!reference) {
    return undefined;
  }
  if (!isExtensionAllowed(reference.kind, opts.extensions)) {
    return undefined;
  }

  const resolved = await resolveAsset({
    reference,
    importerPath: normalizePath(opts.fileName),
    importerVersion: opts.version,
    aliases: opts.aliases,
    host: opts.host,
    cache: opts.cache,
  });
  if (!resolved) {
    return undefined;
  }

  const touching = touchingRange(reference, opts.position);
  return {
    resolved,
    start: touching.start,
    end: touching.end,
  };
}

/** Prefer the symbol/specifier range that contains `position`. */
function touchingRange(
  reference: AssetReference,
  position: number,
): { start: number; end: number } {
  for (const range of reference.symbolRanges) {
    if (position >= range.start && position < range.end) {
      return range;
    }
  }
  if (
    position >= reference.sourceStart &&
    position < reference.sourceEnd
  ) {
    return { start: reference.sourceStart, end: reference.sourceEnd };
  }
  // Fallback: specifier range (findAssetReferenceAt already matched).
  if (reference.symbolRanges.length > 0) {
    return reference.symbolRanges[0]!;
  }
  return { start: reference.sourceStart, end: reference.sourceEnd };
}

export function scriptKindForLanguageId(languageId: string): ts.ScriptKind {
  const ts = getTypeScript();
  if (languageId === 'typescriptreact' || languageId === 'javascriptreact') {
    return ts.ScriptKind.TSX;
  }
  if (languageId === 'javascript') {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

export { createResolutionCache };
export type { ResolutionCache };
