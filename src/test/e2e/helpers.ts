import * as vscode from 'vscode';

export type DefinitionResult = vscode.Location | vscode.LocationLink;

export function targetUri(def: DefinitionResult): vscode.Uri {
  return 'targetUri' in def ? def.targetUri : def.uri;
}

export function basenames(defs: DefinitionResult[]): string[] {
  return defs.map((d) => targetUri(d).path.split('/').pop() ?? '');
}

export async function openDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);
  return doc;
}

/** Position of the `nth` (0-based) occurrence of `needle`, plus `delta` characters. */
export function positionOf(
  doc: vscode.TextDocument,
  needle: string,
  nth = 0,
  delta = 0,
): vscode.Position {
  const text = doc.getText();
  let i = -1;
  for (let n = 0; n <= nth; n++) {
    i = text.indexOf(needle, i + 1);
    if (i < 0) {
      throw new Error(`needle not found: ${needle}#${nth}`);
    }
  }
  return doc.positionAt(i + delta);
}

export async function definitionsAt(
  doc: vscode.TextDocument,
  position: vscode.Position,
): Promise<DefinitionResult[]> {
  return (
    (await vscode.commands.executeCommand<DefinitionResult[]>(
      'vscode.executeDefinitionProvider',
      doc.uri,
      position,
    )) ?? []
  );
}

/**
 * tsserver starts lazily; poll until `predicate` holds for the definitions at
 * `position` (or give up after `timeoutMs`).
 */
export async function waitForDefinitions(
  doc: vscode.TextDocument,
  position: vscode.Position,
  predicate: (defs: DefinitionResult[]) => boolean,
  timeoutMs = 30000,
): Promise<DefinitionResult[]> {
  const deadline = Date.now() + timeoutMs;
  let defs: DefinitionResult[] = [];
  while (Date.now() < deadline) {
    defs = await definitionsAt(doc, position);
    if (predicate(defs)) {
      return defs;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return defs;
}

export async function hoverText(
  doc: vscode.TextDocument,
  position: vscode.Position,
): Promise<string> {
  const hovers =
    (await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider',
      doc.uri,
      position,
    )) ?? [];
  return hovers
    .flatMap((h) => h.contents)
    .map((c) => (typeof c === 'string' ? c : c.value))
    .join('\n');
}
