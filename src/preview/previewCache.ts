export interface PreviewCacheKeyParts {
  physicalUri: string;
  /** The import's original specifier: it is rendered into the markdown. */
  originalSpecifier: string;
  /** Stat size and/or mtime (or content fingerprint) for revalidation. */
  revalidationToken: string;
  maxPreviewBytes: number;
  svgPreview: boolean;
}

export interface PreviewCache {
  get(key: string): string | undefined;
  set(key: string, markdown: string): void;
  clear(): void;
  size(): number;
}

/** Build a stable cache key; never uri-only (requires revalidationToken). */
export function previewCacheKey(parts: PreviewCacheKeyParts): string {
  return [
    parts.physicalUri,
    parts.originalSpecifier,
    parts.revalidationToken,
    String(parts.maxPreviewBytes),
    parts.svgPreview ? '1' : '0',
  ].join('\0');
}

export function createPreviewCache(maxEntries = 64): PreviewCache {
  const map = new Map<string, string>();
  return {
    get(key: string): string | undefined {
      const value = map.get(key);
      if (value === undefined) {
        return undefined;
      }
      // Refresh LRU order.
      map.delete(key);
      map.set(key, value);
      return value;
    },
    set(key: string, markdown: string): void {
      if (map.has(key)) {
        map.delete(key);
      }
      map.set(key, markdown);
      while (map.size > maxEntries) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) {
          break;
        }
        map.delete(oldest);
      }
    },
    clear(): void {
      map.clear();
    },
    size(): number {
      return map.size;
    },
  };
}
