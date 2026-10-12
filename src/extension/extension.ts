import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  PHASE0_HOVER_APPROACH,
  buildPhase0HoverMarkdown,
  type SvgHoverApproach,
} from './phase0Hover';

export {
  PHASE0_HOVER_APPROACH,
  buildPhase0HoverMarkdown,
  type SvgHoverApproach,
} from './phase0Hover';

const PHASE0_SVG_SPECIFIER = './icon.svg?react';

export function activate(context: vscode.ExtensionContext): void {
  const provider = vscode.languages.registerHoverProvider(
    [
      { language: 'typescript', scheme: 'file' },
      { language: 'typescriptreact', scheme: 'file' },
    ],
    {
      provideHover(document, position) {
        return providePhase0SvgHover(document, position, PHASE0_HOVER_APPROACH);
      },
    },
  );
  context.subscriptions.push(provider);
}

export function deactivate(): void {
  // no-op
}

export function providePhase0SvgHover(
  document: vscode.TextDocument,
  position: vscode.Position,
  approach: SvgHoverApproach = PHASE0_HOVER_APPROACH,
): vscode.Hover | undefined {
  const line = document.lineAt(position.line).text;
  if (!line.includes(PHASE0_SVG_SPECIFIER)) {
    return undefined;
  }

  const importMatch = line.match(
    /import\s+(\w+)\s+from\s+(['"])(\.\/icon\.svg\?react)\2/,
  );
  if (!importMatch) {
    return undefined;
  }

  const localName = importMatch[1];
  const specifier = importMatch[3];
  const nameIndex = line.indexOf(localName);
  const specIndex = line.indexOf(specifier);
  const offset = position.character;
  const onName =
    nameIndex >= 0 && offset >= nameIndex && offset <= nameIndex + localName.length;
  const onSpec =
    specIndex >= 0 && offset >= specIndex && offset <= specIndex + specifier.length;
  if (!onName && !onSpec) {
    return undefined;
  }

  const svgPath = path.join(path.dirname(document.uri.fsPath), 'icon.svg');
  if (!fs.existsSync(svgPath)) {
    return undefined;
  }

  const svgContents = fs.readFileSync(svgPath, 'utf8');
  // Reject scripted SVG for hover preview (fail closed to metadata)
  const effectiveApproach: SvgHoverApproach = /<script[\s>]/i.test(svgContents)
    ? 'metadata-only'
    : approach;

  const relativePath = vscode.workspace.asRelativePath(svgPath, false);
  const md = new vscode.MarkdownString(
    buildPhase0HoverMarkdown(svgPath, relativePath, effectiveApproach, svgContents),
  );
  md.isTrusted = false;
  return new vscode.Hover(md);
}
