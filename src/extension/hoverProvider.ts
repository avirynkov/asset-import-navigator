import * as vscode from 'vscode';
import {
  aliasBaseDirForDocument,
  readExtensionNavConfig,
} from './configuration';
import {
  resolveAssetHoverAt,
  scriptKindForLanguageId,
  type ResolutionCache,
} from './assetNavigationCore';
import type { AssetResolverHost } from '../shared/model/resolvedAsset';
import { normalizePath } from '../shared/resolution/pathUtils';
import {
  createPreviewCache,
  previewCacheKey,
  type PreviewCache,
} from '../preview/previewCache';
import { renderAssetHoverMarkdown } from '../preview/svgPreviewRenderer';

export interface AssetHoverProviderHandle extends vscode.HoverProvider {
  clearPreviewCache(): void;
}

/**
 * Narrow HoverProvider for supported asset import positions only.
 * Preview failures never touch the resolution cache used by navigation.
 */
export function createHoverProvider(
  host: AssetResolverHost,
  resolutionCache: ResolutionCache,
  previewCache: PreviewCache = createPreviewCache(),
): AssetHoverProviderHandle {
  return {
    clearPreviewCache(): void {
      previewCache.clear();
    },

    async provideHover(
      document: vscode.TextDocument,
      position: vscode.Position,
      token: vscode.CancellationToken,
    ): Promise<vscode.Hover | undefined> {
      const config = readExtensionNavConfig(aliasBaseDirForDocument(document.uri));
      if (
        !config.enabled ||
        !config.hoverEnabled ||
        !config.queryPolicySupported
      ) {
        return undefined;
      }

      const target = await resolveAssetHoverAt({
        text: document.getText(),
        fileName: normalizePath(document.uri.fsPath),
        scriptKind: scriptKindForLanguageId(document.languageId),
        version: document.version,
        position: document.offsetAt(position),
        enabled: config.enabled,
        extensions: config.extensions,
        queryPolicySupported: config.queryPolicySupported,
        aliases: config.aliases,
        host,
        cache: resolutionCache,
      });

      if (token.isCancellationRequested || !target) {
        return undefined;
      }

      const physicalPath = target.resolved.physicalUri;
      const fileUri = vscode.Uri.file(physicalPath);
      const relativePath = vscode.workspace.asRelativePath(fileUri, false);
      const openFileUri = fileUri.toString();
      const range = new vscode.Range(
        document.positionAt(target.start),
        document.positionAt(target.end),
      );

      let stat: vscode.FileStat;
      try {
        stat = await vscode.workspace.fs.stat(fileUri);
      } catch {
        return undefined;
      }

      const byteLength = stat.size;
      const revalidationToken = `${stat.size}:${stat.mtime}`;
      const cacheKey = previewCacheKey({
        physicalUri: physicalPath,
        revalidationToken,
        maxPreviewBytes: config.hoverMaxPreviewBytes,
        svgPreview: config.hoverSvgPreview,
      });

      const cached = previewCache.get(cacheKey);
      if (cached !== undefined) {
        return markdownHover(cached, range);
      }

      const overCap = byteLength > config.hoverMaxPreviewBytes;
      let svgText: string | undefined;

      if (!overCap && target.resolved.kind === 'svg') {
        try {
          if (!host.readFile) {
            return undefined;
          }
          const bytes = await host.readFile(physicalPath);
          if (token.isCancellationRequested) {
            return undefined;
          }
          svgText = Buffer.from(bytes).toString('utf8');
        } catch {
          return undefined;
        }
      }

      let markdown: string | undefined;
      try {
        markdown = renderAssetHoverMarkdown({
          kind: target.resolved.kind,
          physicalPath,
          relativePath,
          originalSpecifier: target.resolved.originalSpecifier,
          openFileUri,
          byteLength,
          svgText: overCap ? undefined : svgText,
          svgPreview: config.hoverSvgPreview && !overCap,
          maxPreviewBytes: config.hoverMaxPreviewBytes,
        });
      } catch {
        // Preview failure → metadata-only fallback (still no nav impact).
        try {
          markdown = renderAssetHoverMarkdown({
            kind: target.resolved.kind,
            physicalPath,
            relativePath,
            originalSpecifier: target.resolved.originalSpecifier,
            openFileUri,
            byteLength,
            svgText: undefined,
            svgPreview: false,
            maxPreviewBytes: config.hoverMaxPreviewBytes,
          });
        } catch {
          return undefined;
        }
      }

      if (!markdown) {
        return undefined;
      }

      previewCache.set(cacheKey, markdown);
      return markdownHover(markdown, range);
    },
  };
}

function markdownHover(
  markdown: string,
  range: vscode.Range,
): vscode.Hover {
  const md = new vscode.MarkdownString(markdown);
  md.isTrusted = false;
  md.supportHtml = false;
  return new vscode.Hover(md, range);
}
