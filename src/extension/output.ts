import * as vscode from 'vscode';
import type { NavigationModeReport } from './modeDetection';

const CHANNEL_NAME = 'Asset Import Navigator';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel(CHANNEL_NAME);
  }
  return channel;
}

export function disposeOutputChannel(): void {
  channel?.dispose();
  channel = undefined;
}

/**
 * Log mode classification when debug is enabled.
 * Never log source file contents or asset bodies.
 */
export function logModeIfDebug(
  debug: boolean,
  report: NavigationModeReport,
): void {
  if (!debug) {
    return;
  }
  getOutputChannel().appendLine(`[asset-import-navigator] ${report.label}`);
}

/** Optional short diagnostic line (no file contents). */
export function logDebugLine(debug: boolean, message: string): void {
  if (!debug) {
    return;
  }
  getOutputChannel().appendLine(`[asset-import-navigator] ${message}`);
}
