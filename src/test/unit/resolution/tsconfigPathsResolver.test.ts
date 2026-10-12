import { describe, expect, it } from 'vitest';
import {
  loadTsconfigPathMappings,
  matchPathsPattern,
  resolveTsconfigPathsCandidate,
} from '../../../shared/resolution/tsconfigPathsResolver';
import { createFsHost, createMemoryHost, fixturesRoot } from './testHost';

describe('matchPathsPattern', () => {
  it('prefers exact match over wildcards', () => {
    const paths = {
      '@/*': ['src/*'],
      '@/exact': ['src/special'],
    };
    expect(matchPathsPattern('@/exact', paths)).toEqual({
      pattern: '@/exact',
      starCapture: undefined,
    });
  });

  it('uses longest prefix before *', () => {
    const paths = {
      '*': ['fallback/*'],
      '@/*': ['src/*'],
      '@assets/*': ['assets/*'],
    };
    expect(matchPathsPattern('@assets/icon.svg', paths)).toEqual({
      pattern: '@assets/*',
      starCapture: 'icon.svg',
    });
  });
});

describe('tsconfigPathsResolver fixtures', () => {
  const host = createFsHost();

  it('AC-2.1 / RES-02 / RES-03: @/* → src/*', async () => {
    const root = fixturesRoot('aliases');
    const importer = `${root}/src/components/App.tsx`;
    const mappings = await loadTsconfigPathMappings(host, importer);
    expect(mappings).toBeTruthy();
    const candidate = await resolveTsconfigPathsCandidate(
      host,
      '@/assets/icon.svg',
      mappings!,
    );
    expect(candidate).toBe(`${root}/src/assets/icon.svg`);
  });

  it('AC-2.6: nested extends inherits parent paths', async () => {
    const root = fixturesRoot('nested-tsconfig');
    const importer = `${root}/packages/app/src/Widget.tsx`;
    const mappings = await loadTsconfigPathMappings(host, importer);
    expect(mappings?.configPath).toBe(`${root}/packages/app/tsconfig.json`);
    const candidate = await resolveTsconfigPathsCandidate(
      host,
      '@assets/badge.svg',
      mappings!,
    );
    expect(candidate).toBe(`${root}/shared-assets/badge.svg`);
  });

  it('multi-target: first existing wins', async () => {
    const hostMem = createMemoryHost({
      '/proj/tsconfig.json': JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['missing/*', 'src/*'],
          },
        },
      }),
      '/proj/src/icon.svg': '<svg/>',
    });
    const mappings = await loadTsconfigPathMappings(hostMem, '/proj/app/File.tsx');
    const candidate = await resolveTsconfigPathsCandidate(
      hostMem,
      '@/icon.svg',
      mappings!,
    );
    expect(candidate).toBe('/proj/src/icon.svg');
  });

  it('baseUrl fallback when no paths match (RES-02)', async () => {
    const hostMem = createMemoryHost({
      '/proj/tsconfig.json': JSON.stringify({
        compilerOptions: {
          baseUrl: 'src',
        },
      }),
      '/proj/src/assets/raw.svg': '<svg/>',
    });
    const mappings = await loadTsconfigPathMappings(hostMem, '/proj/src/App.tsx');
    const candidate = await resolveTsconfigPathsCandidate(
      hostMem,
      'assets/raw.svg',
      mappings!,
    );
    expect(candidate).toBe('/proj/src/assets/raw.svg');
  });

  it('skips tsconfig stage when readFile is missing', async () => {
    const hostNoRead: typeof host = {
      fileExists: host.fileExists,
    };
    const mappings = await loadTsconfigPathMappings(
      hostNoRead,
      fixturesRoot('aliases', 'src/components/App.tsx'),
    );
    expect(mappings).toBeUndefined();
  });
});
