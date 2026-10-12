import type * as ts from 'typescript/lib/tsserverlibrary';

/** Phase 0 fixture module specifier that must rewrite to physical SVG. */
export const PHASE0_SVG_SPECIFIER = './icon.svg?react';

export interface SpikeDefinitionResult {
  definitions: ts.DefinitionInfo[];
  textSpan: ts.TextSpan;
}

/**
 * Pure helper: if position is on the Phase 0 `./icon.svg?react` import
 * (local name or specifier), return a replaced definition pointing at the
 * physical SVG beside the importing file. Otherwise return undefined.
 */
export function trySpikeAssetDefinition(
  typescript: typeof ts,
  program: ts.Program | undefined,
  fileName: string,
  position: number,
): SpikeDefinitionResult | undefined {
  if (!program) {
    return undefined;
  }

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return undefined;
  }

  const importDecl = findImportDeclarationAt(typescript, sourceFile, position);
  if (!importDecl) {
    return undefined;
  }

  const specifierText = stripQuotes(importDecl.moduleSpecifier.getText(sourceFile));
  if (specifierText !== PHASE0_SVG_SPECIFIER) {
    return undefined;
  }

  if (!positionTouchesImport(typescript, sourceFile, importDecl, position)) {
    return undefined;
  }

  const physicalSvg = resolvePhysicalSvgPath(fileName);
  const textSpan = getBoundSpan(typescript, sourceFile, importDecl, position);

  const definition: ts.DefinitionInfo = {
    fileName: physicalSvg,
    textSpan: { start: 0, length: 0 },
    kind: typescript.ScriptElementKind.scriptElement,
    name: 'icon.svg',
    containerKind: typescript.ScriptElementKind.unknown,
    containerName: '',
  };

  return {
    definitions: [definition],
    textSpan,
  };
}

function findImportDeclarationAt(
  typescript: typeof ts,
  sourceFile: ts.SourceFile,
  position: number,
): ts.ImportDeclaration | undefined {
  let node: ts.Node = sourceFile;
  const visit = (n: ts.Node): void => {
    if (position >= n.getStart(sourceFile) && position < n.getEnd()) {
      node = n;
      typescript.forEachChild(n, visit);
    }
  };
  visit(sourceFile);

  let current: ts.Node | undefined = node;
  while (current) {
    if (typescript.isImportDeclaration(current)) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function positionTouchesImport(
  typescript: typeof ts,
  sourceFile: ts.SourceFile,
  importDecl: ts.ImportDeclaration,
  position: number,
): boolean {
  const spec = importDecl.moduleSpecifier;
  if (position >= spec.getStart(sourceFile) && position < spec.getEnd()) {
    return true;
  }

  const clause = importDecl.importClause;
  if (!clause) {
    return false;
  }

  if (clause.name) {
    const name = clause.name;
    if (position >= name.getStart(sourceFile) && position < name.getEnd()) {
      return true;
    }
  }

  const bindings = clause.namedBindings;
  if (bindings && typescript.isNamespaceImport(bindings)) {
    const name = bindings.name;
    if (position >= name.getStart(sourceFile) && position < name.getEnd()) {
      return true;
    }
  }

  return false;
}

function getBoundSpan(
  typescript: typeof ts,
  sourceFile: ts.SourceFile,
  importDecl: ts.ImportDeclaration,
  position: number,
): ts.TextSpan {
  const clause = importDecl.importClause;
  if (clause?.name) {
    const name = clause.name;
    if (position >= name.getStart(sourceFile) && position < name.getEnd()) {
      return {
        start: name.getStart(sourceFile),
        length: name.getWidth(sourceFile),
      };
    }
  }

  const spec = importDecl.moduleSpecifier;
  return {
    start: spec.getStart(sourceFile),
    length: spec.getWidth(sourceFile),
  };
}

function stripQuotes(text: string): string {
  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith('`') && text.endsWith('`'))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

/** Resolve `icon.svg` next to the importing file (Phase 0 fixture layout). */
export function resolvePhysicalSvgPath(importingFileName: string): string {
  const normalized = importingFileName.replace(/\\/g, '/');
  const dir = normalized.includes('/')
    ? normalized.slice(0, normalized.lastIndexOf('/'))
    : '.';
  return `${dir}/icon.svg`;
}
