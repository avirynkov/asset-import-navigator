import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { findAssetReferenceAt } from '../../../shared/parser/assetReferenceDetector';
import type { AssetReference } from '../../../shared/model/assetReference';

function parse(
  code: string,
  scriptKind: ts.ScriptKind,
  fileName = 'sample.ts',
): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
}

/** Position of the first character of `needle` in `code`. */
function posOf(code: string, needle: string): number {
  const i = code.indexOf(needle);
  expect(i).toBeGreaterThanOrEqual(0);
  return i;
}

function expectHit(
  code: string,
  needle: string,
  scriptKind: ts.ScriptKind,
  expected: Partial<AssetReference>,
  fileName?: string,
): AssetReference {
  const sourceFile = parse(code, scriptKind, fileName);
  const ref = findAssetReferenceAt(sourceFile, posOf(code, needle));
  expect(ref).toBeDefined();
  expect(ref).toMatchObject(expected);
  return ref!;
}

function expectMiss(
  code: string,
  needle: string,
  scriptKind: ts.ScriptKind = ts.ScriptKind.TS,
): void {
  const sourceFile = parse(code, scriptKind);
  expect(findAssetReferenceAt(sourceFile, posOf(code, needle))).toBeUndefined();
}

describe('findAssetReferenceAt — B.4 positives', () => {
  it('default import with ?react (specifier + binding)', () => {
    const code = `import Icon from './icon.svg?react';\n`;
    expectHit(code, 'Icon', ts.ScriptKind.TS, {
      originalSpecifier: './icon.svg?react',
      physicalSpecifier: './icon.svg',
      query: 'react',
      hash: null,
      kind: 'svg',
    });
    expectHit(code, './icon.svg?react', ts.ScriptKind.TS, {
      kind: 'svg',
      physicalSpecifier: './icon.svg',
      query: 'react',
    });
  });

  it('namespace import', () => {
    const code = `import * as icons from './icons.svg';\n`;
    expectHit(code, 'icons', ts.ScriptKind.TS, {
      originalSpecifier: './icons.svg',
      physicalSpecifier: './icons.svg',
      query: null,
      kind: 'svg',
    });
    expectHit(code, './icons.svg', ts.ScriptKind.TS, { kind: 'svg' });
  });

  it('CSS module default import', () => {
    const code = `import styles from './Button.module.scss';\n`;
    expectHit(code, 'styles', ts.ScriptKind.TS, {
      originalSpecifier: './Button.module.scss',
      physicalSpecifier: './Button.module.scss',
      kind: 'scss',
      query: null,
    });
  });

  it('side-effect stylesheet import (specifier only)', () => {
    const code = `import './global.scss';\n`;
    const ref = expectHit(code, './global.scss', ts.ScriptKind.TS, {
      kind: 'scss',
      physicalSpecifier: './global.scss',
    });
    expect(ref.symbolRanges).toEqual([]);
  });

  it('export { default as Icon } from asset', () => {
    const code = `export { default as Icon } from './icon.svg?react';\n`;
    expectHit(code, 'Icon', ts.ScriptKind.TS, {
      kind: 'svg',
      physicalSpecifier: './icon.svg',
      query: 'react',
    });
    expectHit(code, './icon.svg?react', ts.ScriptKind.TS, { kind: 'svg' });
  });

  it('export * from stylesheet', () => {
    const code = `export * from './theme.css';\n`;
    const ref = expectHit(code, './theme.css', ts.ScriptKind.TS, {
      kind: 'css',
      physicalSpecifier: './theme.css',
    });
    expect(ref.symbolRanges).toEqual([]);
  });
});

describe('findAssetReferenceAt — ScriptKind coverage (AC-1.6)', () => {
  const importLine = `import Icon from './icon.svg?react';\n`;

  it('TS', () => {
    expectHit(importLine, 'Icon', ts.ScriptKind.TS, { kind: 'svg' }, 'a.ts');
  });

  it('TSX', () => {
    const code = `${importLine} const x = <div />;\n`;
    expectHit(code, 'Icon', ts.ScriptKind.TSX, { kind: 'svg' }, 'a.tsx');
  });

  it('JS', () => {
    expectHit(importLine, 'Icon', ts.ScriptKind.JS, { kind: 'svg' }, 'a.js');
  });

  it('JSX', () => {
    const code = `${importLine} const x = <div />;\n`;
    expectHit(code, 'Icon', ts.ScriptKind.JSX, { kind: 'svg' }, 'a.jsx');
  });
});

describe('findAssetReferenceAt — negatives (AC-1.2 / NINT-04)', () => {
  it('comment containing .svg', () => {
    expectMiss(`// import Icon from './icon.svg'\nconst x = 1;\n`, './icon.svg');
  });

  it('malformed import', () => {
    const code = `import from './icon.svg';\n`;
    expectMiss(code, './icon.svg');
  });

  it('unrelated string literal', () => {
    expectMiss(`const path = './icon.svg';\n`, './icon.svg');
  });

  it('package import', () => {
    expectMiss(`import x from 'lodash';\n`, 'lodash');
  });

  it('normal TS relative import', () => {
    expectMiss(`import { foo } from './util';\n`, './util');
  });

  it('fetch URL', () => {
    expectMiss(`fetch('/assets/icon.svg');\n`, '/assets/icon.svg');
  });

  it('unsupported extension import', () => {
    expectMiss(`import img from './x.png';\n`, './x.png');
  });

  it('position on from keyword of a valid asset import', () => {
    const code = `import Icon from './icon.svg?react';\n`;
    expectMiss(code, ' from ');
  });

  it('named import from asset-looking path', () => {
    expectMiss(`import { ReactComponent } from './icon.svg';\n`, 'ReactComponent');
  });

  it('import type from asset', () => {
    expectMiss(`import type Icon from './icon.svg';\n`, 'Icon');
  });
});

describe('findAssetReferenceAt — range semantics', () => {
  it('symbolRanges cover default binding half-open', () => {
    const code = `import Icon from './icon.svg';\n`;
    const sourceFile = parse(code, ts.ScriptKind.TS);
    const ref = findAssetReferenceAt(sourceFile, posOf(code, 'Icon'));
    expect(ref).toBeDefined();
    expect(ref!.symbolRanges).toHaveLength(1);
    const [range] = ref!.symbolRanges;
    expect(code.slice(range.start, range.end)).toBe('Icon');
    // Half-open: end is exclusive
    expect(
      findAssetReferenceAt(sourceFile, range.end),
    ).toBeUndefined();
  });
});
