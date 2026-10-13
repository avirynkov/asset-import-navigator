export interface SvgDimensions {
  width: string | null;
  height: string | null;
  viewBox: string | null;
}

export interface SvgMetadata {
  byteLength: number;
  width: string | null;
  height: string | null;
  viewBox: string | null;
}

/**
 * Cheap SVG metadata from UTF-8 text (root `<svg` attributes only).
 * No DOM parser — regex on the opening tag when present.
 */
export function extractSvgMetadata(
  svgText: string,
  byteLength: number = Buffer.byteLength(svgText, 'utf8'),
): SvgMetadata {
  const dims = extractRootSvgDimensions(svgText);
  return {
    byteLength,
    width: dims.width,
    height: dims.height,
    viewBox: dims.viewBox,
  };
}

export function extractSvgMetadataFromBytes(bytes: Uint8Array): SvgMetadata {
  const text = decodeUtf8(bytes);
  return extractSvgMetadata(text, bytes.byteLength);
}

function extractRootSvgDimensions(svgText: string): SvgDimensions {
  const match = svgText.match(/<svg\b([^>]*)>/i);
  if (!match) {
    return { width: null, height: null, viewBox: null };
  }
  const attrs = match[1] ?? '';
  return {
    width: attrValue(attrs, 'width'),
    height: attrValue(attrs, 'height'),
    viewBox: attrValue(attrs, 'viewBox'),
  };
}

function attrValue(attrs: string, name: string): string | null {
  const re = new RegExp(
    // Attribute boundary: whitespace or start, so `stroke-width` is not `width`.
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const m = attrs.match(re);
  if (!m) {
    return null;
  }
  const value = m[1] ?? m[2] ?? m[3];
  return value && value.length > 0 ? value : null;
}

function decodeUtf8(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('utf8');
}
