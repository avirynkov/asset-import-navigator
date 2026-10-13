/**
 * Phase 6 / B.12 must-not-break list (NINT-01…NINT-05) on the provider-conflicts
 * fixture: package imports, local imports, legitimate `.d.ts` symbols, arbitrary
 * strings, fetch URLs and CSS Modules `styles.foo` stay with TypeScript.
 * Checked for Mode B (extension-host core) and Mode A (tsserver interceptor).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  collectAssetDocumentLinks,
  createResolutionCache,
  resolveAssetDefinitionAt,
  resolveAssetHoverAt,
} from '../../../extension/assetNavigationCore';
import { createTsserverFileSystem } from '../../../platform/tsserverFileSystem';
import { DEFAULT_EXTENSIONS } from '../../../tsserver-plugin/configuration';
import { normalizePath } from '../../../shared/resolution/pathUtils';
import { createProgramFromFixture, tryRewrite } from '../../unit/tsserver-plugin/testUtils';

const ROOT = path.resolve(__dirname, '../../fixtures/provider-conflicts');
const APP = normalizePath(path.join(ROOT, 'App.ts'));
const TEXT = fs.readFileSync(APP, 'utf8');

function nodeHost() {
  return createTsserverFileSystem({
    fileExists: (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
    readFile: (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : undefined),
  });
}

function coreOpts(position: number) {
  return {
    text: TEXT,
    fileName: APP,
    scriptKind: ts.ScriptKind.TS,
    version: 1,
    position,
    enabled: true,
    extensions: DEFAULT_EXTENSIONS,
    queryPolicySupported: true,
    aliases: {},
    host: nodeHost(),
    cache: createResolutionCache(),
  };
}

/** Offset of `needle` (nth occurrence, 0-based) plus `delta`. */
function at(needle: string, nth = 0, delta = 0): number {
  let i = -1;
  for (let n = 0; n <= nth; n++) {
    i = TEXT.indexOf(needle, i + 1);
    if (i < 0) {
      throw new Error(`needle not found: ${needle}#${nth}`);
    }
  }
  return i + delta;
}

const NEGATIVES: Array<[label: string, position: number]> = [
  ['NINT-02 package import binding', at('pkgFn')],
  ['NINT-02 package specifier', at("'fake-pkg'", 0, 1)],
  ['NINT-02 package call site', at('pkgFn', 1)],
  ['NINT-01 local import binding', at('localFn')],
  ['NINT-01 local specifier', at("'./local'", 0, 1)],
  ['NINT-03 legitimate .d.ts global', at('legitGlobal')],
  ['NINT-04 arbitrary asset-like string', at("'/assets/x.svg'", 0, 2)],
  ['NINT-04 fetch URL string', at("'/a.svg'", 0, 2)],
  ['NINT-05 styles.foo member', at('styles.foo', 0, 'styles.'.length)],
  ['NINT-05 styles usage identifier', at('styles.foo')],
];

describe('compatibility: must-not-break list (B.12)', () => {
  const program = createProgramFromFixture(ROOT);

  for (const [label, position] of NEGATIVES) {
    it(`${label}: no asset definition / hover (Mode B core)`, async () => {
      expect(await resolveAssetDefinitionAt(coreOpts(position))).toBeUndefined();
      expect(await resolveAssetHoverAt(coreOpts(position))).toBeUndefined();
    });

    it(`${label}: no rewrite (Mode A interceptor)`, () => {
      expect(tryRewrite(program, APP, position)).toBeUndefined();
    });
  }

  it('positive control: CSS module import binding resolves in both modes', async () => {
    const position = at('styles');
    const cssPath = normalizePath(path.join(ROOT, 'Card.module.css'));
    expect((await resolveAssetDefinitionAt(coreOpts(position)))?.targetPath).toBe(cssPath);
    expect(tryRewrite(program, APP, position)?.definitions[0]?.fileName).toBe(cssPath);
  });

  it('document links cover only the asset import', async () => {
    const links = await collectAssetDocumentLinks(coreOpts(0));
    expect(links.map((l) => l.targetPath)).toEqual([
      normalizePath(path.join(ROOT, 'Card.module.css')),
    ]);
  });
});
