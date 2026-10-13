import * as vscode from 'vscode';
import {
  isConfigurePluginAvailable,
  registerPluginConfigurationListener,
  syncPluginConfiguration,
} from './configurePluginBridge';
import { CONFIG_SECTION, readExtensionNavConfig } from './configuration';
import { createDocumentLinkProvider } from './documentLinkProvider';
import { createDefinitionProviderFallback } from './definitionProviderFallback';
import { createHoverProvider } from './hoverProvider';
import { createResolutionCache } from './assetNavigationCore';
import { createVscodeFileSystem } from '../platform/vscodeFileSystem';
import { invalidateOnExtensionConfigChange } from '../shared/resolution/resolutionCache';
import { detectNavigationMode } from './modeDetection';
import { disposeOutputChannel, getOutputChannel, logModeIfDebug } from './output';

/** Hover: TS/TSX/JS/JSX (C.7). */
const HOVER_SELECTOR: vscode.DocumentSelector = [
  { language: 'typescript', scheme: 'file' },
  { language: 'typescriptreact', scheme: 'file' },
  { language: 'javascript', scheme: 'file' },
  { language: 'javascriptreact', scheme: 'file' },
];

/** Document links + fallback definition remain TS/TSX-only (Phase 4 scope). */
const NAV_SELECTOR: vscode.DocumentSelector = [
  { language: 'typescript', scheme: 'file' },
  { language: 'typescriptreact', scheme: 'file' },
];

export function activate(context: vscode.ExtensionContext): void {
  const host = createVscodeFileSystem();
  const resolutionCache = createResolutionCache();
  const hoverProvider = createHoverProvider(host, resolutionCache);

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(HOVER_SELECTOR, hoverProvider),
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      NAV_SELECTOR,
      createDocumentLinkProvider(host, resolutionCache),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      NAV_SELECTOR,
      createDefinitionProviderFallback(host, resolutionCache),
    ),
  );

  context.subscriptions.push(getOutputChannel());
  context.subscriptions.push({ dispose: () => disposeOutputChannel() });

  registerPluginConfigurationListener(context);
  void syncPluginConfiguration().then(() => reportMode());

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_SECTION)) {
        invalidateOnExtensionConfigChange(resolutionCache);
        hoverProvider.clearPreviewCache();
        void reportMode();
      }
      if (event.affectsConfiguration('js/ts.experimental.useTsgo')) {
        void reportMode();
      }
    }),
  );
}

/** Phase 0 COMPAT-03 probe key (`js/ts.experimental.useTsgo`). */
function readUseTsgoSetting(): boolean {
  return Boolean(
    vscode.workspace
      .getConfiguration()
      .get<boolean>('js/ts.experimental.useTsgo'),
  );
}

async function reportMode(): Promise<void> {
  const base =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
  const config = readExtensionNavConfig(base);
  const configurePluginAvailable = await isConfigurePluginAvailable();
  const report = detectNavigationMode({
    useTsgo: readUseTsgoSetting(),
    configurePluginAvailable,
  });
  logModeIfDebug(config.debug, report);
}

export function deactivate(): void {
  // no-op
}
