import { describe, expect, it } from 'vitest';
import type { AssetResolverHost } from '../../../shared/model/resolvedAsset';
import {
  createResolutionCache,
  resolveAsset,
  resolveAssetSync,
} from '../../../shared/resolution/resolver';
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

  it('keeps only the latest document version per importer', async () => {
    const { host } = mutableHost(files);
    const cache = createResolutionCache();
    for (const importerVersion of [1, 2, 3]) {
      await resolveAsset({ reference, importerPath: '/proj/src/App.tsx', importerVersion, aliases: {}, host, cache });
    }
    expect(cache.resolutions.size).toBe(1);
    expect([...cache.resolutions.keys()][0]).toContain('\u00003\u0000');
  });
});
