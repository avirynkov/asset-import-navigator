import { describe, expect, it } from 'vitest';
import { extractSvgMetadata } from '../../../preview/svgMetadata';

describe('svgMetadata', () => {
  it('extracts width height viewBox from root svg', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect/></svg>`;
    const meta = extractSvgMetadata(svg);
    expect(meta.width).toBe('16');
    expect(meta.height).toBe('16');
    expect(meta.viewBox).toBe('0 0 16 16');
    expect(meta.byteLength).toBe(Buffer.byteLength(svg, 'utf8'));
  });

  it('returns null dims when attributes missing', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>`;
    const meta = extractSvgMetadata(svg);
    expect(meta.width).toBeNull();
    expect(meta.height).toBeNull();
    expect(meta.viewBox).toBeNull();
  });

  it('does not read stroke-width as width (Heroicons-style root)', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"><path/></svg>`;
    const meta = extractSvgMetadata(svg);
    expect(meta.width).toBeNull();
    expect(meta.viewBox).toBe('0 0 24 24');
  });
});
