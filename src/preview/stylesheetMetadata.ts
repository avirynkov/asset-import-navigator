import * as path from 'node:path';

export type StylesheetModuleKind = 'module' | 'plain';

export interface StylesheetMetadata {
  fileName: string;
  moduleKind: StylesheetModuleKind;
  byteLength: number;
}

/**
 * Classify CSS/SCSS/Sass/Less paths as CSS Modules (`*.module.*`) vs plain.
 */
export function extractStylesheetMetadata(
  physicalPath: string,
  byteLength: number,
): StylesheetMetadata {
  const fileName = path.basename(physicalPath);
  return {
    fileName,
    moduleKind: isCssModuleFileName(fileName) ? 'module' : 'plain',
    byteLength,
  };
}

export function isCssModuleFileName(fileName: string): boolean {
  return /\.module\.(css|scss|sass|less)$/i.test(fileName);
}
