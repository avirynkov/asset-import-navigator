import * as path from 'node:path';

/**
 * Phase 0 hover approach under test.
 * Order: markdown-image → raster-data-uri → metadata-only.
 */
export type SvgHoverApproach = 'markdown-image' | 'raster-data-uri' | 'metadata-only';

/** Chosen Phase 0 approach (locked after spike). */
export const PHASE0_HOVER_APPROACH: SvgHoverApproach = 'markdown-image';

/** Build hover markdown for the Phase 0 SVG import (testable, no vscode import). */
export function buildPhase0HoverMarkdown(
  svgPath: string,
  relativePath: string,
  approach: SvgHoverApproach,
  svgContents: string,
): string {
  const baseName = path.basename(svgPath);
  switch (approach) {
    case 'markdown-image': {
      const encoded = encodeURIComponent(svgContents);
      return [
        `**${baseName}**`,
        '',
        `\`${relativePath}\``,
        '',
        `![${baseName}](data:image/svg+xml,${encoded})`,
        '',
      ].join('\n');
    }
    case 'raster-data-uri': {
      return [
        `**${baseName}** (raster-data-uri unavailable in spike)`,
        '',
        `\`${relativePath}\``,
        '',
      ].join('\n');
    }
    case 'metadata-only':
    default: {
      return [
        `**${baseName}**`,
        '',
        `Path: \`${relativePath}\``,
        '',
        `Size: ${Buffer.byteLength(svgContents, 'utf8')} bytes`,
        '',
      ].join('\n');
    }
  }
}
