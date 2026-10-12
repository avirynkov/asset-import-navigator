import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPhase0HoverMarkdown } from '../../extension/phase0Hover';

const fixtureDir = path.resolve(__dirname, '../fixtures/phase0');
const svgPath = path.join(fixtureDir, 'icon.svg');

describe('phase0 SVG hover spike', () => {
  it('markdown-image embeds local SVG as data URI (no remote URL)', () => {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const md = buildPhase0HoverMarkdown(svgPath, 'icon.svg', 'markdown-image', svg);
    expect(md).toContain('![icon.svg](data:image/svg+xml,');
    expect(md).toContain('icon.svg');
    expect(md).not.toMatch(/https?:\/\//);
    expect(md).toContain(encodeURIComponent('<svg'));
  });

  it('metadata-only includes path and size', () => {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const md = buildPhase0HoverMarkdown(svgPath, 'icon.svg', 'metadata-only', svg);
    expect(md).toContain('Path:');
    expect(md).toContain('Size:');
    expect(md).not.toContain('data:image');
  });
});
