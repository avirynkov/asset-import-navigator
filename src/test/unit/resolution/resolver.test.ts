import { describe, expect, it } from 'vitest';
import {
  createResolutionCache,
  resolveAsset,
  resolveAssetSync,
} from '../../../shared/resolution/resolver';
import { createFsHost, createMemoryHost, fixturesRoot, ref } from './testHost';

describe('resolveAsset orchestration', () => {
  const host = createFsHost();

  it('AC-2.1: @/assets/icon.svg?react via tsconfig paths', async () => {
    const root = fixturesRoot('aliases');
    const result = await resolveAsset({
      reference: ref({
        originalSpecifier: '@/assets/icon.svg?react',
        physicalSpecifier: '@/assets/icon.svg',
        query: 'react',
        kind: 'svg',
      }),
      importerPath: `${root}/src/components/App.tsx`,
      importerVersion: 1,
      aliases: {},
      host,
    });
    expect(result).toEqual({
      physicalUri: `${root}/src/assets/icon.svg`,
      originalSpecifier: '@/assets/icon.svg?react',
      physicalSpecifier: '@/assets/icon.svg',
      kind: 'svg',
      query: 'react',
    });
  });

  it('AC-2.2 / RES-01: relative Card.module.scss', async () => {
    const root = fixturesRoot('aliases');
    const result = await resolveAsset({
      reference: ref({
        physicalSpecifier: './Card.module.scss',
        kind: 'scss',
      }),
      importerPath: `${root}/src/components/Card.tsx`,
      importerVersion: 1,
      aliases: {},
      host,
    });
    expect(result?.physicalUri).toBe(`${root}/src/components/Card.module.scss`);
  });

  it('AC-2.4 / RES-04: configured aliases without tsconfig paths', async () => {
    const root = fixturesRoot('aliases');
    const icon = `${root}/src/assets/icon.svg`;
    const result = await resolveAsset({
      reference: ref({
        physicalSpecifier: '@assets/icon.svg',
        kind: 'svg',
      }),
      importerPath: `${root}/src/components/App.tsx`,
      importerVersion: 1,
      aliases: {
        '@assets/': `${root}/src/assets/`,
      },
      host,
      // Use importer with no useful paths for this specifier — still works via aliases
    });
    // @assets/ does not match @/* in tsconfig; falls through to configured alias
    expect(result?.physicalUri).toBe(icon);
  });

  it('AC-2.6: nested extends', async () => {
    const root = fixturesRoot('nested-tsconfig');
    const result = await resolveAsset({
      reference: ref({
        physicalSpecifier: '@assets/badge.svg',
        kind: 'svg',
      }),
      importerPath: `${root}/packages/app/src/Widget.tsx`,
      importerVersion: 1,
      aliases: {},
      host,
    });
    expect(result?.physicalUri).toBe(`${root}/shared-assets/badge.svg`);
  });

  it('caches second resolve', async () => {
    const root = fixturesRoot('aliases');
    const cache = createResolutionCache();
    const opts = {
      reference: ref({
        physicalSpecifier: '@/assets/icon.svg',
        kind: 'svg' as const,
      }),
      importerPath: `${root}/src/components/App.tsx`,
      importerVersion: 1,
      aliases: {},
      host,
      cache,
    };
    const a = await resolveAsset(opts);
    expect(cache.resolutions.size).toBeGreaterThan(0);
    const b = await resolveAsset(opts);
    expect(b).toEqual(a);
  });

  it('resolveAssetSync matches resolveAsset for relative + tsconfig', async () => {
    const root = fixturesRoot('aliases');
    const opts = {
      reference: ref({
        originalSpecifier: '@/assets/icon.svg?react',
        physicalSpecifier: '@/assets/icon.svg',
        query: 'react',
        kind: 'svg' as const,
      }),
      importerPath: `${root}/src/components/App.tsx`,
      importerVersion: 1,
      aliases: {},
      host,
    };
    const asyncResult = await resolveAsset(opts);
    const syncResult = resolveAssetSync(opts);
    expect(syncResult).toEqual(asyncResult);
  });

  it('resolveAssetSync relative SCSS', () => {
    const root = fixturesRoot('aliases');
    const result = resolveAssetSync({
      reference: ref({
        physicalSpecifier: './Card.module.scss',
        kind: 'scss',
      }),
      importerPath: `${root}/src/components/Card.tsx`,
      importerVersion: 1,
      aliases: {},
      host,
    });
    expect(result?.physicalUri).toBe(`${root}/src/components/Card.module.scss`);
  });

  it('resolveAssetSync: throwing readFile does not throw (Mode A safety)', () => {
    const root = fixturesRoot('aliases');
    const throwingHost = {
      fileExists: () => true,
      readFile: (): Uint8Array => {
        throw new Error('tsserver readFile missing');
      },
    };
    expect(() =>
      resolveAssetSync({
        reference: ref({
          physicalSpecifier: '@/assets/icon.svg',
          kind: 'svg',
        }),
        importerPath: `${root}/src/components/App.tsx`,
        importerVersion: 1,
        aliases: {},
        host: throwingHost,
      }),
    ).not.toThrow();
  });

  it('does not sticky-cache negative misses', async () => {
    const root = '/mem/proj';
    const files: Record<string, string> = {
      [`${root}/tsconfig.json`]: JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } },
      }),
      [`${root}/src/App.tsx`]: 'export {};',
    };
    const cache = createResolutionCache();
    const opts = {
      reference: ref({
        physicalSpecifier: '@/assets/icon.svg',
        kind: 'svg' as const,
      }),
      importerPath: `${root}/src/App.tsx`,
      importerVersion: 1,
      aliases: {},
      host: createMemoryHost(files),
      cache,
    };

    expect(await resolveAsset(opts)).toBeUndefined();
    expect(cache.resolutions.size).toBe(0);

    files[`${root}/src/assets/icon.svg`] = '<svg/>';
    const hit = await resolveAsset({
      ...opts,
      host: createMemoryHost(files),
      cache,
    });
    expect(hit?.physicalUri).toBe(`${root}/src/assets/icon.svg`);
  });
});
