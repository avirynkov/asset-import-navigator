export type SvgSanitizeRejectReason =
  | 'oversized'
  | 'malformed'
  | 'script'
  | 'remote-url'
  | 'event-handler'
  | 'entity-doctype';

export type SvgSanitizeResult =
  | { ok: true; svg: string }
  | { ok: false; reason: SvgSanitizeRejectReason };

/**
 * Detect-and-reject unsafe SVG for hover preview (no strip-and-embed).
 * Safe SVGs are returned unchanged for markdown-image embedding.
 */
export function sanitizeSvgForPreview(
  svgText: string,
  maxBytes: number,
): SvgSanitizeResult {
  const byteLength = Buffer.byteLength(svgText, 'utf8');
  if (byteLength > maxBytes) {
    return { ok: false, reason: 'oversized' };
  }

  if (!hasRootSvg(svgText)) {
    return { ok: false, reason: 'malformed' };
  }

  if (/<!ENTITY/i.test(svgText) || hasExternalDoctype(svgText)) {
    return { ok: false, reason: 'entity-doctype' };
  }

  if (/<script[\s>]/i.test(svgText) || /javascript:/i.test(svgText)) {
    return { ok: false, reason: 'script' };
  }

  if (hasRemoteUrl(svgText)) {
    return { ok: false, reason: 'remote-url' };
  }

  if (/\bon[a-z]+\s*=/i.test(svgText)) {
    return { ok: false, reason: 'event-handler' };
  }

  return { ok: true, svg: svgText };
}

export function sanitizeSvgBytesForPreview(
  bytes: Uint8Array,
  maxBytes: number,
): SvgSanitizeResult {
  if (bytes.byteLength > maxBytes) {
    return { ok: false, reason: 'oversized' };
  }
  let text: string;
  try {
    text = Buffer.from(bytes).toString('utf8');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  // Reject obvious binary / replacement-heavy payloads.
  if (text.includes('\uFFFD') && !hasRootSvg(text)) {
    return { ok: false, reason: 'malformed' };
  }
  return sanitizeSvgForPreview(text, maxBytes);
}

function hasRootSvg(svgText: string): boolean {
  return /<svg\b/i.test(svgText);
}

function hasExternalDoctype(svgText: string): boolean {
  // Reject DOCTYPE that references external subsets / SYSTEM / PUBLIC ids.
  return /<!DOCTYPE\b[^>]*(SYSTEM|PUBLIC)\b/i.test(svgText);
}

function hasRemoteUrl(svgText: string): boolean {
  // href / xlink:href with http(s) or protocol-relative URLs.
  const hrefRe =
    /(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(svgText)) !== null) {
    const value = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (/^(https?:)?\/\//i.test(value) || /^https?:/i.test(value)) {
      return true;
    }
  }
  return false;
}
