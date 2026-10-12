import * as vscode from 'vscode';
import { settingsToPluginPayload } from '../tsserver-plugin/configuration';

const PLUGIN_ID = 'asset-import-navigator-ts-plugin';
const CONFIG_SECTION = 'assetImportNavigator';

interface TypeScriptApi {
  configurePlugin?(pluginId: string, configuration: unknown): void;
}

/**
 * True when typescript-language-features exposes configurePlugin (Mode A expected path).
 * Does not prove the plugin module loaded into tsserver.
 */
export async function isConfigurePluginAvailable(): Promise<boolean> {
  const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
  if (!tsExtension) {
    return false;
  }

  if (!tsExtension.isActive) {
    try {
      await tsExtension.activate();
    } catch {
      return false;
    }
  }

  const exports = tsExtension.exports as
    | { getAPI?(version: number): TypeScriptApi | undefined }
    | undefined;
  const api = exports?.getAPI?.(0);
  return Boolean(api?.configurePlugin);
}

/**
 * Push B.9 nav settings into the tsserver plugin via typescript-language-features.
 * Not a navigation provider — config bridge only (Phase 3).
 * @returns true when configurePlugin was invoked successfully.
 */
export async function syncPluginConfiguration(): Promise<boolean> {
  const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
  if (!tsExtension) {
    return false;
  }

  if (!tsExtension.isActive) {
    try {
      await tsExtension.activate();
    } catch {
      return false;
    }
  }

  const exports = tsExtension.exports as { getAPI?(version: number): TypeScriptApi | undefined } | undefined;
  const api = exports?.getAPI?.(0);
  if (!api?.configurePlugin) {
    return false;
  }

  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const payload = settingsToPluginPayload({
    enabled: cfg.get<boolean>('enabled'),
    extensions: cfg.get<string[]>('extensions'),
    aliases: cfg.get<Record<string, string>>('aliases'),
    queryPolicy: cfg.get<string>('queryPolicy'),
  });

  api.configurePlugin(PLUGIN_ID, payload);
  return true;
}

export function registerPluginConfigurationListener(
  context: vscode.ExtensionContext,
): void {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_SECTION)) {
        void syncPluginConfiguration();
      }
    }),
  );
}
