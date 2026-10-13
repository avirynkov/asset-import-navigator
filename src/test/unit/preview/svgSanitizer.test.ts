import { describe, expect, it } from 'vitest';
import { sanitizeSvgForPreview } from '../../../preview/svgSanitizer';

const SAFE = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>`;

describe('svgSanitizer detect-and-reject', () => {
  it('accepts safe local SVG', () => {
    const result = sanitizeSvgForPreview(SAFE, 524288);
    expect(result).toEqual({ ok: true, svg: SAFE });
  });

  it('rejects oversized SVG', () => {
    const result = sanitizeSvgForPreview(SAFE, 10);
    expect(result).toEqual({ ok: false, reason: 'oversized' });
  });

  it('rejects malformed (no root svg)', () => {
    const result = sanitizeSvgForPreview('<div>not svg</div>', 524288);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects scripted SVG', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({
      ok: false,
      reason: 'script',
    });
  });

  it('rejects javascript: URL', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"/></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({
      ok: false,
      reason: 'script',
    });
  });

  it('rejects external-href remote URL', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.svg"/></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({
      ok: false,
      reason: 'remote-url',
    });
  });

  it('rejects protocol-relative href', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><use href="//cdn.example/icon.svg"/></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({
      ok: false,
      reason: 'remote-url',
    });
  });

  it('rejects event handlers', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" onclick="alert(1)"></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({
      ok: false,
      reason: 'event-handler',
    });
  });

  it('rejects ENTITY declarations', () => {
    const svg = `<!ENTITY xxe SYSTEM "file:///etc/passwd">\n<svg xmlns="http://www.w3.org/2000/svg"></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({
      ok: false,
      reason: 'entity-doctype',
    });
  });

  it('rejects external DOCTYPE', () => {
    const svg = `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg xmlns="http://www.w3.org/2000/svg"></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({
      ok: false,
      reason: 'entity-doctype',
    });
  });

  it('rejects remote CSS url() in style attribute', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://evil.example/x#g)"/></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({ ok: false, reason: 'remote-url' });
  });

  it('rejects protocol-relative CSS url()', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><style>rect{fill:url('//evil.example/x')}</style><rect/></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({ ok: false, reason: 'remote-url' });
  });

  it('rejects @import in <style>', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><style>@import "x.css";</style><rect/></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288)).toEqual({ ok: false, reason: 'remote-url' });
  });

  it('accepts local url(#id) and data: references', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)" style="mask:url('data:image/png;base64,AA==')"/></svg>`;
    expect(sanitizeSvgForPreview(svg, 524288).ok).toBe(true);
  });
});
