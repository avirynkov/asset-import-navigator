import { describe, expect, it } from 'vitest';
import {
  createPreviewCache,
  previewCacheKey,
} from '../../../preview/previewCache';

describe('previewCache', () => {
  it('requires revalidation token in key (not uri-only)', () => {
    const a = previewCacheKey({
      physicalUri: '/a/icon.svg',
      revalidationToken: '10:1',
      maxPreviewBytes: 524288,
      svgPreview: true,
    });
    const b = previewCacheKey({
      physicalUri: '/a/icon.svg',
      revalidationToken: '10:2',
      maxPreviewBytes: 524288,
      svgPreview: true,
    });
    expect(a).not.toBe(b);
  });

  it('get/set/clear and LRU eviction', () => {
    const cache = createPreviewCache(2);
    cache.set('k1', 'm1');
    cache.set('k2', 'm2');
    expect(cache.get('k1')).toBe('m1');
    cache.set('k3', 'm3');
    // k2 evicted (least recently used after k1 refresh)
    expect(cache.get('k2')).toBeUndefined();
    expect(cache.get('k1')).toBe('m1');
    expect(cache.get('k3')).toBe('m3');
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
