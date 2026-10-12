import * as vscode from 'vscode';
import {
  absolutizeAliases,
  DEFAULT_EXTENSIONS,
  type QueryPolicy,
} from '../tsserver-plugin/configuration';
import { normalizePath } from '../shared/resolution/pathUtils';

const CONFIG_SECTION = 'assetImportNavigator';

export interface ExtensionNavConfig {
  enabled: boolean;
  extensions: readonly string[];
  /** Absolute path-prefix alias map (values absolutized). */
  aliases: Readonly<Record<string, string>>;
  queryPolicy: QueryPolicy;
  queryPolicySupported: boolean;
  debug: boolean;
}

/**
 * Read B.9 settings and absolutize aliases against `baseDir`
 * (typically the document's workspace folder fsPath).
 */
export function readExtensionNavConfig(baseDir: string): ExtensionNavConfig {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const enabled = cfg.get<boolean>('enabled', true);
  const extensions =
    cfg.get<string[]>('extensions', [...DEFAULT_EXTENSIONS]) ?? [
      ...DEFAULT_EXTENSIONS,
    ];
  const rawAliases = cfg.get<Record<string, string>>('aliases', {}) ?? {};
  const queryPolicy = cfg.get<string>(
    'queryPolicy',
    'strip-for-supported-extension',
  );
  const debug = cfg.get<boolean>('debug', false);
  const queryPolicySupported =
    queryPolicy === undefined ||
    queryPolicy === null ||
    queryPolicy === 'strip-for-supported-extension';

  return {
    enabled,
    extensions: normalizeExtensions(extensions),
    aliases: absolutizeAliases(rawAliases, normalizePath(baseDir)),
    queryPolicy: 'strip-for-supported-extension',
    queryPolicySupported,
    debug,
  };
}

/** Workspace folder for a document, or first workspace folder, or process.cwd(). */
export function aliasBaseDirForDocument(documentUri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(documentUri);
  if (folder) {
    return folder.uri.fsPath;
  }
  const first = vscode.workspace.workspaceFolders?.[0];
  if (first) {
    return first.uri.fsPath;
  }
  return process.cwd();
}

function normalizeExtensions(extensions: string[]): string[] {
  const out: string[] = [];
  for (const item of extensions) {
    if (typeof item === 'string' && item.length > 0) {
      out.push(item.startsWith('.') ? item.toLowerCase() : `.${item.toLowerCase()}`);
    }
  }
  return out.length > 0 ? out : [...DEFAULT_EXTENSIONS];
}

export { CONFIG_SECTION };
