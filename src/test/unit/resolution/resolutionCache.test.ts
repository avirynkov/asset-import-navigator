import { describe, expect, it } from 'vitest';
import {
  aliasesFingerprint,
  createResolutionCache,
  invalidateOnAssetFileChange,
  invalidateOnDocumentChange,
  invalidateOnExtensionConfigChange,
  invalidateOnTsconfigChange,
  invalidateOnWorkspaceFolderChange,
  resolutionCacheKey,
} from '../../../shared/resolution/resolutionCache';

describe('resolutionCache', () => {
  it('builds stable aliases fingerprint', () => {
    expect(aliasesFingerprint({ b: '/b', a: '/a' })).toBe(
      aliasesFingerprint({ a: '/a', b: '/b' }),
    );
  });

  it('invalidate helpers are pure map clears', () => {
    const cache = createResolutionCache();
    cache.configByImporterDir.set('/proj', null);
    const key = resolutionCacheKey({
      importerPath: '/proj/a.tsx',
      importerVersion: 1,
      physicalSpecifier: './x.svg',
      aliasesFp: '',
      configContentId: 'abc',
    });
    cache.resolutions.set(key, undefined);

    invalidateOnDocumentChange(cache, '/proj/a.tsx');
    expect(cache.resolutions.has(key)).toBe(false);

    cache.resolutions.set(key, undefined);
    invalidateOnTsconfigChange(cache);
    expect(cache.configByImporterDir.size).toBe(0);
    expect(cache.resolutions.size).toBe(0);

    cache.resolutions.set(key, undefined);
    invalidateOnExtensionConfigChange(cache);
    expect(cache.resolutions.size).toBe(0);

    cache.resolutions.set(key, undefined);
    invalidateOnAssetFileChange(cache);
    expect(cache.resolutions.size).toBe(0);

    cache.configByImporterDir.set('/x', null);
    cache.resolutions.set(key, undefined);
    invalidateOnWorkspaceFolderChange(cache);
    expect(cache.configByImporterDir.size).toBe(0);
    expect(cache.resolutions.size).toBe(0);
  });
});
