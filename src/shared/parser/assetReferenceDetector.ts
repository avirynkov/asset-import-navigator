import type ts from 'typescript';
import type { AssetReference } from '../model/assetReference';
import { classifyAsset } from '../resolution/assetClassifier';
import { parseModuleSpecifier } from './moduleSpecifier';
import { getTypeScript } from '../typescriptRuntime';

/**
 * Detect a supported static asset import/export reference at `position`.
 * Uses TypeScript AST only (no regex). Prefer false negatives.
 */
export function findAssetReferenceAt(
  sourceFile: ts.SourceFile,
  position: number,
): AssetReference | undefined {
  const ts = getTypeScript();
  const decl = findImportOrExportAt(sourceFile, position);
  if (!decl) {
    return undefined;
  }

  if (ts.isImportDeclaration(decl)) {
    return referenceFromImport(sourceFile, decl, position);
  }

  if (ts.isExportDeclaration(decl)) {
    return referenceFromExport(sourceFile, decl, position);
  }

  return undefined;
}

function findImportOrExportAt(
  sourceFile: ts.SourceFile,
  position: number,
): ts.ImportDeclaration | ts.ExportDeclaration | undefined {
  const ts = getTypeScript();
  let node: ts.Node = sourceFile;
  const visit = (n: ts.Node): void => {
    if (position >= n.getStart(sourceFile) && position < n.getEnd()) {
      node = n;
      ts.forEachChild(n, visit);
    }
  };
  visit(sourceFile);

  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isImportDeclaration(current) || ts.isExportDeclaration(current)) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function referenceFromImport(
  sourceFile: ts.SourceFile,
  importDecl: ts.ImportDeclaration,
  position: number,
): AssetReference | undefined {
  const ts = getTypeScript();
  if (importDecl.importClause?.isTypeOnly) {
    return undefined;
  }

  const clause = importDecl.importClause;
  // Named value imports (import { X } from '…') are not in B.4.
  if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    return undefined;
  }

  const built = buildReference(sourceFile, importDecl.moduleSpecifier, () => {
    const ranges: Array<{ start: number; end: number }> = [];
    if (clause?.name) {
      ranges.push({
        start: clause.name.getStart(sourceFile),
        end: clause.name.getEnd(),
      });
    }
    if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      const name = clause.namedBindings.name;
      ranges.push({
        start: name.getStart(sourceFile),
        end: name.getEnd(),
      });
    }
    return ranges;
  });

  if (!built) {
    return undefined;
  }

  if (!positionTouches(built, position)) {
    return undefined;
  }

  return built;
}

function referenceFromExport(
  sourceFile: ts.SourceFile,
  exportDecl: ts.ExportDeclaration,
  position: number,
): AssetReference | undefined {
  const ts = getTypeScript();
  if (exportDecl.isTypeOnly) {
    return undefined;
  }

  // Need a module specifier (re-export from '…').
  if (!exportDecl.moduleSpecifier) {
    return undefined;
  }

  const exportClause = exportDecl.exportClause;

  // Named re-exports: only `export { default as Icon } from '…'` (B.4).
  // `export * from` has no exportClause.
  if (exportClause) {
    if (ts.isNamespaceExport(exportClause)) {
      // `export * as ns from` — not in B.4
      return undefined;
    }
    if (ts.isNamedExports(exportClause)) {
      const supported = exportClause.elements.every(isDefaultAsExportSpecifier);
      if (!supported || exportClause.elements.length === 0) {
        return undefined;
      }
    }
  }

  const built = buildReference(sourceFile, exportDecl.moduleSpecifier, () => {
    const ranges: Array<{ start: number; end: number }> = [];
    if (exportClause && ts.isNamedExports(exportClause)) {
      for (const el of exportClause.elements) {
        // Prefer ExportSpecifier.name (e.g. Icon in `default as Icon`)
        ranges.push({
          start: el.name.getStart(sourceFile),
          end: el.name.getEnd(),
        });
      }
    }
    return ranges;
  });

  if (!built) {
    return undefined;
  }

  if (!positionTouches(built, position)) {
    return undefined;
  }

  return built;
}

/** `export { default as Icon }` — propertyName is `default`, name is `Icon`. */
function isDefaultAsExportSpecifier(el: ts.ExportSpecifier): boolean {
  const ts = getTypeScript();
  if (el.isTypeOnly) {
    return false;
  }
  if (!el.propertyName) {
    return false;
  }
  return (
    ts.isIdentifier(el.propertyName) && el.propertyName.text === 'default'
  );
}

function buildReference(
  sourceFile: ts.SourceFile,
  moduleSpecifier: ts.Expression,
  symbolRangesFn: () => Array<{ start: number; end: number }>,
): AssetReference | undefined {
  const ts = getTypeScript();
  if (!ts.isStringLiteralLike(moduleSpecifier)) {
    return undefined;
  }

  const originalSpecifier = moduleSpecifier.text;
  const { physicalSpecifier, query, hash } =
    parseModuleSpecifier(originalSpecifier);
  const kind = classifyAsset(physicalSpecifier);
  if (kind === 'unknown') {
    return undefined;
  }

  return {
    originalSpecifier,
    physicalSpecifier,
    query,
    hash,
    kind,
    sourceStart: moduleSpecifier.getStart(sourceFile),
    sourceEnd: moduleSpecifier.getEnd(),
    symbolRanges: symbolRangesFn(),
  };
}

function positionTouches(ref: AssetReference, position: number): boolean {
  if (position >= ref.sourceStart && position < ref.sourceEnd) {
    return true;
  }
  for (const range of ref.symbolRanges) {
    if (position >= range.start && position < range.end) {
      return true;
    }
  }
  return false;
}
