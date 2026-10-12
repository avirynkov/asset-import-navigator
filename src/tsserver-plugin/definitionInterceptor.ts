import type * as ts from 'typescript/lib/tsserverlibrary';
import { findAssetReferenceAt } from '../shared/parser/assetReferenceDetector';
import type { AssetReference } from '../shared/model/assetReference';
import type { AssetResolverHost } from '../shared/model/resolvedAsset';
import {
  createResolutionCache,
  resolveAssetSync,
  type ResolutionCache,
} from '../shared/resolution/resolver';
import { normalizePath } from '../shared/resolution/pathUtils';
import {
  isExtensionAllowed,
  type PluginNavConfig,
} from './configuration';

export interface DefinitionRewriteResult {
  definitions: ts.DefinitionInfo[];
  textSpan: ts.TextSpan;
}

export interface DefinitionInterceptorContext {
  getConfig: () => PluginNavConfig;
  host: AssetResolverHost;
  cache: ResolutionCache;
  getScriptVersion: (fileName: string) => string;
  logger?: { info(message: string): void };
}

/**
 * Try to rewrite a definition request to the physical asset.
 * Returns undefined to signal "delegate to original language service".
 */
export function tryRewriteAssetDefinition(
  program: ts.Program | undefined,
  fileName: string,
  position: number,
  ctx: DefinitionInterceptorContext,
): DefinitionRewriteResult | undefined {
  const config = ctx.getConfig();
  if (!config.enabled || !config.queryPolicySupported) {
    return undefined;
  }

  if (!program) {
    return undefined;
  }

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return undefined;
  }

  // findAssetReferenceAt uses the `typescript` package AST APIs; SourceFile from
  // the same tsserver instance is structurally compatible at runtime.
  const reference = findAssetReferenceAt(
    sourceFile as unknown as import('typescript').SourceFile,
    position,
  );
  if (!reference) {
    return undefined;
  }

  if (!isExtensionAllowed(reference.kind, config.extensions)) {
    return undefined;
  }

  const importerPath = normalizePath(fileName);
  const importerVersion = ctx.getScriptVersion(fileName);

  const resolved = resolveAssetSync({
    reference,
    importerPath,
    importerVersion,
    aliases: config.aliases,
    host: ctx.host,
    cache: ctx.cache,
  });

  if (!resolved) {
    return undefined;
  }

  const physicalUri = resolved.physicalUri;
  const name = physicalUri.includes('/')
    ? physicalUri.slice(physicalUri.lastIndexOf('/') + 1)
    : physicalUri;

  const definition: ts.DefinitionInfo = {
    fileName: physicalUri,
    textSpan: { start: 0, length: 0 },
    // String values match ts.ScriptElementKind; avoid requiring tsserver enum at call site
    kind: 'script' as ts.ScriptElementKind,
    name,
    containerKind: 'unknown' as ts.ScriptElementKind,
    containerName: '',
  };

  const textSpan = boundSpanForReference(reference, position);

  ctx.logger?.info(
    `[asset-import-navigator-ts-plugin] rewrite → ${physicalUri}`,
  );

  return {
    definitions: [definition],
    textSpan,
  };
}

function boundSpanForReference(
  reference: AssetReference,
  position: number,
): ts.TextSpan {
  for (const range of reference.symbolRanges) {
    if (position >= range.start && position < range.end) {
      return { start: range.start, length: range.end - range.start };
    }
  }
  return {
    start: reference.sourceStart,
    length: reference.sourceEnd - reference.sourceStart,
  };
}

export function createInterceptorCache(): ResolutionCache {
  return createResolutionCache();
}
