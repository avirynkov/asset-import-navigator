/**
 * AC-3.3 / NINT-01…NINT-03: ≥20 unrelated TS navigation cases —
 * interceptor must return undefined (delegate unchanged).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createProgramFromFixture,
  positionOf,
  tryRewrite,
} from './testUtils';

const fixtureDir = path.resolve(__dirname, '../../fixtures/vite-svg-react');
const nintDir = path.resolve(__dirname, '../../fixtures/nint-suite');

describe('AC-3.3 non-interference (NINT)', () => {
  it('helper local function is not rewritten', () => {
    const program = createProgramFromFixture(fixtureDir);
    const appPath = path.join(fixtureDir, 'App.tsx');
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, 'function helper') + 'function '.length;
    expect(tryRewrite(program, appPath, pos)).toBeUndefined();
  });

  it('localValue identifier is not rewritten', () => {
    const program = createProgramFromFixture(fixtureDir);
    const appPath = path.join(fixtureDir, 'App.tsx');
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, 'localValue');
    expect(tryRewrite(program, appPath, pos)).toBeUndefined();
  });

  it('covers ≥20 unrelated positions in nint-suite fixture', () => {
    const program = createProgramFromFixture(nintDir);
    const filePath = path.join(nintDir, 'symbols.ts');
    const text = fs.readFileSync(filePath, 'utf8');

    const needles = [
      'add',
      'multiply',
      'Point',
      'x',
      'y',
      'origin',
      'Label',
      'Tagged',
      'tag',
      'wrap',
      'identity',
      'COLORS',
      'red',
      'Counter',
      'increment',
      'value',
      'createCounter',
      'format',
      'parse',
      'UtilNs',
      'helper',
      'EXTERNAL_CONST',
      'ReactLike',
      'props',
      'children',
    ];

    expect(needles.length).toBeGreaterThanOrEqual(20);

    let checked = 0;
    for (const needle of needles) {
      if (!text.includes(needle)) {
        continue;
      }
      const pos = positionOf(text, needle);
      const rewrite = tryRewrite(program, filePath, pos);
      expect(rewrite, `unexpected rewrite at ${needle}`).toBeUndefined();
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });
});
