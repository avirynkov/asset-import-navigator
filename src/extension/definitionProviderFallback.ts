import * as vscode from 'vscode';
import {
  aliasBaseDirForDocument,
  readExtensionNavConfig,
} from './configuration';
import {
  resolveAssetDefinitionAt,
  scriptKindForLanguageId,
  type ResolutionCache,
} from './assetNavigationCore';
import type { AssetResolverHost } from '../shared/model/resolvedAsset';
import { normalizePath } from '../shared/resolution/pathUtils';

/**
 * Narrow fallback DefinitionProvider (Mode B additive).
 * Asset positions only — never claims other symbols (NINT-01).
 */
export function createDefinitionProviderFallback(
  host: AssetResolverHost,
  cache: ResolutionCache,
): vscode.DefinitionProvider {
  return {
    async provideDefinition(
      document: vscode.TextDocument,
      position: vscode.Position,
      token: vscode.CancellationToken,
    ): Promise<vscode.Definition | undefined> {
      const config = readExtensionNavConfig(aliasBaseDirForDocument(document.uri));
      if (!config.enabled || !config.queryPolicySupported) {
        return undefined;
      }

      const target = await resolveAssetDefinitionAt({
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
        cache,
      });

      if (token.isCancellationRequested || !target) {
        return undefined;
      }

      return new vscode.Location(
        vscode.Uri.file(target.targetPath),
        new vscode.Position(0, 0),
      );
    },
  };
}
