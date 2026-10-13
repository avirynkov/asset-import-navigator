import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderAssetHoverMarkdown } from '../../../preview/svgPreviewRenderer';

const FIXTURES = path.resolve(__dirname, '../../fixtures');
const ICON = path.join(FIXTURES, 'vite-svg-react', 'icon.svg');
const SAFE_SVG = fs.readFileSync(ICON, 'utf8');

describe('svgPreviewRenderer markdown-image hover', () => {
  it('embeds local SVG as data URI (no remote URL) when safe', () => {
    const md = renderAssetHoverMarkdown({
      kind: 'svg',
      physicalPath: ICON,
      relativePath: 'icon.svg',
      originalSpecifier: './icon.svg?react',
      openFileUri: 'file:///tmp/icon.svg',
      byteLength: Buffer.byteLength(SAFE_SVG, 'utf8'),
      svgText: SAFE_SVG,
      svgPreview: true,
      maxPreviewBytes: 524288,
    });
    expect(md).toContain('![icon.svg](data:image/svg+xml,');
    expect(md).toContain('icon.svg');
    expect(md).toContain('./icon.svg?react');
    expect(md).toContain('Size:');
    expect(md).toContain('width=16');
    expect(md).toContain('[Open file](file:///tmp/icon.svg)');
    expect(md).not.toMatch(/https?:\/\//);
    expect(md).toContain(encodeURIComponent('<svg'));
  });

  it('metadata-only when svgPreview=false', () => {
    const md = renderAssetHoverMarkdown({
      kind: 'svg',
      physicalPath: ICON,
      relativePath: 'icon.svg',
      originalSpecifier: './icon.svg?react',
      openFileUri: 'file:///tmp/icon.svg',
      byteLength: Buffer.byteLength(SAFE_SVG, 'utf8'),
      svgText: SAFE_SVG,
      svgPreview: false,
      maxPreviewBytes: 524288,
    });
    expect(md).toContain('Size:');
    expect(md).not.toContain('data:image');
  });

  it('metadata-only for scripted SVG (no data URI)', () => {
    const scripted = `<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>`;
    const md = renderAssetHoverMarkdown({
      kind: 'svg',
      physicalPath: '/x/evil.svg',
      relativePath: 'evil.svg',
      originalSpecifier: './evil.svg',
      openFileUri: 'file:///x/evil.svg',
      byteLength: Buffer.byteLength(scripted, 'utf8'),
      svgText: scripted,
      svgPreview: true,
      maxPreviewBytes: 524288,
    });
    expect(md).not.toContain('data:image');
    expect(md).toContain('evil.svg');
    expect(md).toContain('[Open file]');
  });

  it('metadata-only for oversized (no body)', () => {
    const md = renderAssetHoverMarkdown({
      kind: 'svg',
      physicalPath: ICON,
      relativePath: 'icon.svg',
      originalSpecifier: './icon.svg',
      openFileUri: 'file:///tmp/icon.svg',
      byteLength: 999999,
      svgText: undefined,
      svgPreview: false,
      maxPreviewBytes: 524288,
    });
    expect(md).toContain('Size: 999999 bytes');
    expect(md).not.toContain('data:image');
  });

  it('stylesheet hover shows module type and path', () => {
    const scss = path.join(FIXTURES, 'vite-svg-react', 'Card.module.scss');
    const md = renderAssetHoverMarkdown({
      kind: 'scss',
      physicalPath: scss,
      relativePath: 'Card.module.scss',
      originalSpecifier: './Card.module.scss',
      openFileUri: 'file:///tmp/Card.module.scss',
      byteLength: 42,
      svgPreview: true,
      maxPreviewBytes: 524288,
    });
    expect(md).toContain('Card.module.scss');
    expect(md).toContain('Type: SCSS module');
    expect(md).toContain('Size: 42 bytes');
    expect(md).not.toContain('client.d.ts');
    expect(md).not.toContain('data:image');
  });

  it('plain css stylesheet type', () => {
    const md = renderAssetHoverMarkdown({
      kind: 'css',
      physicalPath: '/proj/global.css',
      relativePath: 'global.css',
      originalSpecifier: './global.css',
      openFileUri: 'file:///proj/global.css',
      byteLength: 10,
      svgPreview: true,
      maxPreviewBytes: 524288,
    });
    expect(md).toContain('Type: CSS stylesheet');
  });

  it('encodes parentheses so an unbalanced ) cannot end the data URI early', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><text>1)</text></svg>`;
    const md = renderAssetHoverMarkdown({
      kind: 'svg',
      physicalPath: '/p/paren.svg',
      relativePath: 'paren.svg',
      originalSpecifier: './paren.svg',
      openFileUri: 'file:///p/paren.svg',
      byteLength: Buffer.byteLength(svg, 'utf8'),
      svgText: svg,
      svgPreview: true,
      maxPreviewBytes: 524288,
    })!;
    const image = md.split('\n').find((l) => l.startsWith('!['))!;
    const destination = image.slice(image.indexOf('](') + 2, -1);
    expect(destination).not.toMatch(/[()]/);
    expect(destination).toContain('%29');
    expect(image.endsWith(')')).toBe(true);
  });

  it('escapes Markdown in file names and specifiers', () => {
    const md = renderAssetHoverMarkdown({
      kind: 'css',
      physicalPath: '/p/a](https:x.example)[b.module.css',
      relativePath: 'a](https:x.example)[b.module.css',
      originalSpecifier: './we`ird.module.css',
      openFileUri: 'file:///p/a%5D(https:x.example)%5Bb.module.css',
      byteLength: 10,
      svgPreview: false,
      maxPreviewBytes: 524288,
    })!;
    expect(md).toContain('**a\\](https:x.example)\\[b.module.css**');
    expect(md).toContain('Specifier: ``./we`ird.module.css``');
    expect(md).toContain('[Open file](file:///p/a%5D%28https:x.example%29%5Bb.module.css)');
  });
});
