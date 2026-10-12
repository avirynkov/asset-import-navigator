import { describe, expect, it } from 'vitest';
import { resolveAsset } from '../../../shared/resolution/resolver';
import { createFsHost, createMemoryHost, fixturesRoot, ref } from './testHost';

describe('resolution negatives (RES-06 / RES-07 / PERF-01)', () => {
  const host = createFsHost();

  it('AC-2.3: missing alias target → undefined (no fabricate)', async () => {
    const root = fixturesRoot('missing-assets');
    const result = await resolveAsset({
      reference: ref({
        physicalSpecifier: '@/assets/ghost.svg',
        kind: 'svg',
      }),
      importerPath: `${root}/src/App.tsx`,
      importerVersion: 1,
      aliases: {},
      host,
    });
    expect(result).toBeUndefined();
  });

  it('AC-2.3: missing relative → undefined, no alias fall-through', async () => {
    const root = fixturesRoot('missing-assets');
    const result = await resolveAsset({
      reference: ref({
        physicalSpecifier: './Missing.module.scss',
        kind: 'scss',
      }),
      importerPath: `${root}/src/relative-miss.tsx`,
      importerVersion: 1,
      aliases: {
        './Missing.module.scss': `${root}/src/App.tsx`,
      },
      host,
    });
    expect(result).toBeUndefined();
  });

  it('unknown kind → undefined without probing', async () => {
    let existsCalls = 0;
    const probingHost = {
      fileExists(): boolean {
        existsCalls += 1;
        return false;
      },
    };
    const result = await resolveAsset({
      reference: ref({
        physicalSpecifier: './x.png',
        kind: 'unknown',
      }),
      importerPath: '/proj/a.tsx',
      importerVersion: 1,
      aliases: {},
      host: probingHost,
    });
    expect(result).toBeUndefined();
    expect(existsCalls).toBe(0);
  });

  it('multi-root-like: does not invent sibling-root paths', async () => {
    const root = fixturesRoot('multi-root-like');
    const result = await resolveAsset({
      reference: ref({
        physicalSpecifier: '@/b.svg',
        kind: 'svg',
      }),
      importerPath: `${root}/root-a/src/importer.tsx`,
      importerVersion: 1,
      aliases: {},
      host,
    });
    // root-a maps @/* → src/*; b.svg lives only under root-b — must not find it
    expect(result).toBeUndefined();
  });

  it('multi-root-like: resolves within own root', async () => {
    const root = fixturesRoot('multi-root-like');
    const result = await resolveAsset({
      reference: ref({
        physicalSpecifier: '@/a.svg',
        kind: 'svg',
      }),
      importerPath: `${root}/root-a/src/importer.tsx`,
      importerVersion: 1,
      aliases: {},
      host,
    });
    expect(result?.physicalUri).toBe(`${root}/root-a/src/a.svg`);
  });

  it('no recursive search: memory host without listing still resolves known paths only', async () => {
    const mem = createMemoryHost({
      '/ws/tsconfig.json': JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } },
      }),
      '/ws/src/only.svg': '<svg/>',
    });
    const hit = await resolveAsset({
      reference: ref({ physicalSpecifier: '@/only.svg', kind: 'svg' }),
      importerPath: '/ws/app/File.tsx',
      importerVersion: 1,
      aliases: {},
      host: mem,
    });
    expect(hit?.physicalUri).toBe('/ws/src/only.svg');

    const miss = await resolveAsset({
      reference: ref({ physicalSpecifier: '@/other.svg', kind: 'svg' }),
      importerPath: '/ws/app/File.tsx',
      importerVersion: 1,
      aliases: {},
      host: mem,
    });
    expect(miss).toBeUndefined();
  });
});
