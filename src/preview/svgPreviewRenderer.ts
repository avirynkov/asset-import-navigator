import * as path from 'node:path';
import type { AssetKind } from '../shared/model/assetReference';
import { extractSvgMetadata } from './svgMetadata';
import { sanitizeSvgForPreview } from './svgSanitizer';
import {
  extractStylesheetMetadata,
  type StylesheetModuleKind,
} from './stylesheetMetadata';

export interface RenderAssetHoverOptions {
  kind: AssetKind;
  physicalPath: string;
  /** Workspace-relative path for display. */
  relativePath: string;
  originalSpecifier: string;
  /** file:// URI string for Open file link (from vscode.Uri.file). */
  openFileUri: string;
  /** File size in bytes (from stat and/or buffer). */
  byteLength: number;
  /** UTF-8 SVG body when under cap and kind is svg; omit for metadata-only. */
  svgText?: string;
  svgPreview: boolean;
  maxPreviewBytes: number;
}

/**
 * Build hover markdown (vscode-free). SVG uses markdown-image when safe;
 * otherwise metadata-only. Stylesheets get module/plain metadata.
 */
export function renderAssetHoverMarkdown(
  opts: RenderAssetHoverOptions,
): string | undefined {
  if (opts.kind === 'svg') {
    return renderSvgHoverMarkdown(opts);
  }
  if (
    opts.kind === 'css' ||
    opts.kind === 'scss' ||
    opts.kind === 'sass' ||
    opts.kind === 'less'
  ) {
    return renderStylesheetHoverMarkdown(opts);
  }
  return undefined;
}

function renderSvgHoverMarkdown(opts: RenderAssetHoverOptions): string {
  const fileName = path.basename(opts.physicalPath);
  const meta =
    opts.svgText !== undefined
      ? extractSvgMetadata(opts.svgText, opts.byteLength)
      : {
          byteLength: opts.byteLength,
          width: null,
          height: null,
          viewBox: null,
        };

  let showPreview = false;
  let svgForPreview: string | undefined;

  if (
    opts.svgPreview &&
    opts.svgText !== undefined &&
    opts.byteLength <= opts.maxPreviewBytes
  ) {
    const sanitized = sanitizeSvgForPreview(
      opts.svgText,
      opts.maxPreviewBytes,
    );
    if (sanitized.ok) {
      showPreview = true;
      svgForPreview = sanitized.svg;
    }
  }

  const lines: string[] = [
    `**${escapeMarkdownText(fileName)}**`,
    '',
    inlineCode(opts.relativePath),
    '',
    `Specifier: ${inlineCode(opts.originalSpecifier)}`,
    '',
    `Size: ${meta.byteLength} bytes`,
  ];

  const dimParts: string[] = [];
  if (meta.width) {
    dimParts.push(`width=${meta.width}`);
  }
  if (meta.height) {
    dimParts.push(`height=${meta.height}`);
  }
  if (meta.viewBox) {
    dimParts.push(`viewBox=${meta.viewBox}`);
  }
  if (dimParts.length > 0) {
    lines.push('', `Dimensions: ${dimParts.join(', ')}`);
  }

  if (showPreview && svgForPreview !== undefined) {
    lines.push(
      '',
      `![${escapeMarkdownText(fileName)}](data:image/svg+xml,${encodeUriStrict(svgForPreview)})`,
    );
  }

  lines.push('', openFileLine(opts.openFileUri), '');
  return lines.join('\n');
}

function renderStylesheetHoverMarkdown(opts: RenderAssetHoverOptions): string {
  const sheet = extractStylesheetMetadata(opts.physicalPath, opts.byteLength);
  const typeLabel = stylesheetTypeLabel(opts.kind, sheet.moduleKind);
  const lines: string[] = [
    `**${escapeMarkdownText(sheet.fileName)}**`,
    '',
    inlineCode(opts.relativePath),
    '',
    `Specifier: ${inlineCode(opts.originalSpecifier)}`,
    '',
    `Type: ${typeLabel}`,
    '',
    `Size: ${sheet.byteLength} bytes`,
    '',
    openFileLine(opts.openFileUri),
    '',
  ];
  return lines.join('\n');
}

function stylesheetTypeLabel(
  kind: AssetKind,
  moduleKind: StylesheetModuleKind,
): string {
  const ext = kind.toUpperCase();
  return moduleKind === 'module' ? `${ext} module` : `${ext} stylesheet`;
}

function openFileLine(openFileUri: string): string {
  return `[Open file](${escapeLinkDestination(openFileUri)})`;
}

/**
 * encodeURIComponent leaves `( ) ! ' *` as-is; an unbalanced `)` would end a
 * Markdown link destination early, so encode those too.
 */
function encodeUriStrict(value: string): string {
  return encodeURIComponent(value).replace(
    /[()!'*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Keep an already-encoded URI intact inside `(...)`. */
function escapeLinkDestination(uri: string): string {
  return uri.replace(/[()\s<>]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
}

/** Backslash-escape inline Markdown syntax (emphasis, code, links, HTML) in names. */
function escapeMarkdownText(value: string): string {
  return value.replace(/[\\`*_[\]<>]/g, '\\$&');
}

/** Inline code span that tolerates backticks in `value` (CommonMark fence rule). */
function inlineCode(value: string): string {
  const longestRun = Math.max(0, ...(value.match(/`+/g) ?? []).map((r) => r.length));
  const fence = '`'.repeat(longestRun + 1);
  const pad = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${value}${pad}${fence}`;
}
