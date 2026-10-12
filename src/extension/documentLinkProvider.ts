import * as vscode from 'vscode';
import {
  aliasBaseDirForDocument,
  readExtensionNavConfig,
} from './configuration';
import {
  collectAssetDocumentLinks,
  scriptKindForLanguageId,
  type ResolutionCache,
} from './assetNavigationCore';
import type { AssetResolverHost } from '../shared/model/resolvedAsset';
import { normalizePath } from '../shared/resolution/pathUtils';

export function createDocumentLinkProvider(
  host: AssetResolverHost,
  cache: ResolutionCache,
): vscode.DocumentLinkProvider {
  return {
    async provideDocumentLinks(
      document: vscode.TextDocument,
      token: vscode.CancellationToken,
    ): Promise<vscode.DocumentLink[]> {
      const config = readExtensionNavConfig(aliasBaseDirForDocument(document.uri));
      if (!config.enabled || !config.queryPolicySupported) {
        return [];
      }

      const targets = await collectAssetDocumentLinks({
        text: document.getText(),
        fileName: normalizePath(document.uri.fsPath),
        scriptKind: scriptKindForLanguageId(document.languageId),
        version: document.version,
        enabled: config.enabled,
        extensions: config.extensions,
        queryPolicySupported: config.queryPolicySupported,
        aliases: config.aliases,
        host,
        cache,
      });

      if (token.isCancellationRequested) {
        return [];
      }

      return targets.map((t) => {
        const range = new vscode.Range(
          document.positionAt(t.start),
          document.positionAt(t.end),
        );
        return new vscode.DocumentLink(range, vscode.Uri.file(t.targetPath));
      });
    },
  };
}
