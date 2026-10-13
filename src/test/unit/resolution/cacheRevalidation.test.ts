import { describe, expect, it } from 'vitest';
import type { AssetResolverHost } from '../../../shared/model/resolvedAsset';
import {
  createResolutionCache,
  resolveAsset,
  resolveAssetSync,
} from '../../../shared/resolution/resolver';
import { invalidateOnDocumentChange } from '../../../shared/resolution/resolutionCache';
import { ref } from './testHost';

/** In-memory host whose files can be deleted between calls. */
function mutableHost(files: Record<string, string>): {
  host: AssetResolverHost;
  remove(path: string): void;
} {
  const map = new Map(Object.entries(files));
  return {
    host: {
      fileExists: (uri) => map.has(uri),
      readFile: (uri) => {
        const text = map.get(uri);
        if (text === undefined) {
          throw new Error(`missing file: ${uri}`);
        }
        return new TextEncoder().encode(text);
      },
    },
    remove: (path) => map.delete(path),
  };
}

const files = {
  '/proj/tsconfig.json': JSON.stringify({
    compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } },
  }),
  '/proj/src/assets/icon.svg': '<svg/>',
  '/proj/src/App.tsx': '',
};

const reference = ref({ physicalSpecifier: '@/assets/icon.svg', kind: 'svg' });

describe('resolution cache correctness (PERF-02 / RES-06)', () => {
  it('async: cached alias hit is dropped once the asset is deleted', async () => {
    const { host, remove } = mutableHost(files);
    const cache = createResolutionCache();
    const opts = { reference, importerPath: '/proj/src/App.tsx', importerVersion: 1, aliases: {}, host, cache };

    expect((await resolveAsset(opts))?.physicalUri).toBe('/proj/src/assets/icon.svg');
    expect(cache.resolutions.size).toBe(1);

    remove('/proj/src/assets/icon.svg');
    expect(await resolveAsset(opts)).toBeUndefined();
    expect(cache.resolutions.size).toBe(0);
  });

  it('sync: cached alias hit is dropped once the asset is deleted', () => {
    const { host, remove } = mutableHost(files);
    const cache = createResolutionCache();
    const opts = { reference, importerPath: '/proj/src/App.tsx', importerVersion: 1, aliases: {}, host, cache };

    expect(resolveAssetSync(opts)?.physicalUri).toBe('/proj/src/assets/icon.svg');
    remove('/proj/src/assets/icon.svg');
    expect(resolveAssetSync(opts)).toBeUndefined();
  });

  it('keeps at most the two most recently used document versions per importer', async () => {
    const { host } = mutableHost(files);
    const cache = createResolutionCache();
    for (const importerVersion of [1, 2, 3]) {
      await resolveAsset({ reference, importerPath: '/proj/src/App.tsx', importerVersion, aliases: {}, host, cache });
    }
    const versions = [...cache.resolutions.keys()].map((k) => k.split('\u0000')[1]);
    expect(versions.sort()).toEqual(['2', '3']);
    expect([...cache.versionsByImporter.get('/proj/src/App.tsx')!.keys()]).toEqual(['2', '3']);
  });

  it('a late result for an older version does not evict the current version', async () => {
    const { host } = mutableHost(files);
    const cache = createResolutionCache();
    const at = (importerVersion: number) =>
      resolveAsset({ reference, importerPath: '/proj/src/App.tsx', importerVersion, aliases: {}, host, cache });
    await at(6); // current version cached
    await at(5); // slow, older request finishes late
    await at(6); // current version is used again (cache hit)
    await at(7); // next edit evicts the least recently used version (5), not 6
    const versions = [...cache.resolutions.keys()].map((k) => k.split('\u0000')[1]).sort();
    expect(versions).toEqual(['6', '7']);
  });

  it('invalidation helpers also reset the version index', async () => {
    const { host } = mutableHost(files);
    const cache = createResolutionCache();
    await resolveAsset({ reference, importerPath: '/proj/src/App.tsx', importerVersion: 1, aliases: {}, host, cache });
    invalidateOnDocumentChange(cache, '/proj/src/App.tsx');
    expect(cache.resolutions.size).toBe(0);
    expect(cache.versionsByImporter.size).toBe(0);
  });

  it('revalidateCachedHit=false returns the cached hit without a disk check', async () => {
    const { host, remove } = mutableHost(files);
    const cache = createResolutionCache();
    const opts = { reference, importerPath: '/proj/src/App.tsx', importerVersion: 1, aliases: {}, host, cache };
    await resolveAsset(opts);
    remove('/proj/src/assets/icon.svg');
    // Hover passes false because it stats the target itself.
    expect((await resolveAsset({ ...opts, revalidateCachedHit: false }))?.physicalUri).toBe('/proj/src/assets/icon.svg');
    expect(await resolveAsset(opts)).toBeUndefined();
  });
});
