/**
 * Phase 6 / B.11 (PERF-03): measure resolver latency on representative fixtures.
 * Ceilings are 3× the engineering targets so CI noise does not flake; the
 * measured medians are printed for docs/phase-6-findings.md.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  createResolutionCache,
  resolveAssetDefinitionAt,
  resolveAssetHoverAt,
} from '../../../extension/assetNavigationCore';
import { createTsserverFileSystem } from '../../../platform/tsserverFileSystem';
import { DEFAULT_EXTENSIONS } from '../../../tsserver-plugin/configuration';
import { normalizePath } from '../../../shared/resolution/pathUtils';

const RUNS = 50;
const ROOT = path.resolve(__dirname, '../../fixtures/aliases');
const APP = normalizePath(path.join(ROOT, 'src/components/App.tsx'));
const TEXT = fs.readFileSync(APP, 'utf8');
const ICON = normalizePath(path.join(ROOT, 'src/assets/icon.svg'));

const host = createTsserverFileSystem({
  fileExists: (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
  readFile: (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : undefined),
});

function opts(cache = createResolutionCache()) {
  return {
    text: TEXT,
    fileName: APP,
    scriptKind: ts.ScriptKind.TSX,
    version: 1,
    position: TEXT.indexOf('Icon'),
    enabled: true,
    extensions: DEFAULT_EXTENSIONS,
    queryPolicySupported: true,
    aliases: {},
    host,
    cache,
  };
}

async function medianMs(fn: () => Promise<unknown>): Promise<number> {
  await fn(); // warm-up (module load, first parse)
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)]!;
}

describe('compatibility: resolver performance (B.11)', () => {
  it('cached navigation < 20 ms target', async () => {
    const shared = opts();
    const ms = await medianMs(async () => {
      expect((await resolveAssetDefinitionAt(shared))?.targetPath).toBe(ICON);
    });
    console.log(`[perf] cached navigation median: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(60);
  });

  it('uncached alias resolution < 75 ms target', async () => {
    const ms = await medianMs(async () => {
      expect((await resolveAssetDefinitionAt(opts()))?.targetPath).toBe(ICON);
    });
    console.log(`[perf] uncached alias resolution median: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(225);
  });

  it('cached hover metadata < 30 ms target', async () => {
    const shared = opts();
    const ms = await medianMs(async () => {
      expect((await resolveAssetHoverAt(shared))?.resolved.physicalUri).toBe(ICON);
    });
    console.log(`[perf] cached hover target median: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(90);
  });
});
