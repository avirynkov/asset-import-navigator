export type NavigationModeReport =
  | { kind: 'mode-a-expected'; label: string }
  | { kind: 'mode-b'; reason: 'native-tsgo' | 'plugin-unavailable'; label: string };

/**
 * Observational Mode A expected vs Mode B classification for debug OutputChannel.
 * Does not prove the tsserver plugin loaded — only what the environment implies.
 *
 * Check order is mandatory: useTsgo first (configurePlugin may still exist under native/tsgo).
 * Pure — no vscode import (testable under Vitest).
 */
export function detectNavigationMode(opts: {
  useTsgo?: boolean;
  configurePluginAvailable: boolean;
}): NavigationModeReport {
  if (opts.useTsgo === true) {
    return {
      kind: 'mode-b',
      reason: 'native-tsgo',
      label:
        'Mode B (native/tsgo; plugin unavailable — COMPAT-03)',
    };
  }
  if (opts.configurePluginAvailable) {
    return {
      kind: 'mode-a-expected',
      label: 'Mode A expected (classic tsserver plugin path)',
    };
  }
  return {
    kind: 'mode-b',
    reason: 'plugin-unavailable',
    label: 'Mode B (plugin / TypeScript API unavailable)',
  };
}
