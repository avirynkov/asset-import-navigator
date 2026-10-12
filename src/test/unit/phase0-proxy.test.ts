import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  PHASE0_SVG_SPECIFIER,
  resolvePhysicalSvgPath,
  trySpikeAssetDefinition,
} from '../../tsserver-plugin/definitionSpike';

const fixtureDir = path.resolve(__dirname, '../fixtures/phase0');
const samplePath = path.join(fixtureDir, 'sample.tsx');

function createProgram(): ts.Program {
  const configPath = path.join(fixtureDir, 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    fixtureDir,
  );
  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });
}

function positionOf(sourceText: string, needle: string, occurrence = 0): number {
  let from = 0;
  let found = -1;
  for (let i = 0; i <= occurrence; i++) {
    found = sourceText.indexOf(needle, from);
    if (found < 0) {
      throw new Error(`needle not found: ${needle}`);
    }
    from = found + needle.length;
  }
  return found;
}

describe('phase0 definitionSpike', () => {
  it('resolves physical svg beside importer', () => {
    const importing = path.join(fixtureDir, 'sample.tsx').replace(/\\/g, '/');
    expect(resolvePhysicalSvgPath(importing)).toBe(
      `${fixtureDir.replace(/\\/g, '/')}/icon.svg`,
    );
  });

  it('rewrites definition on Icon identifier for ./icon.svg?react', () => {
    const program = createProgram();
    const sourceFile = program.getSourceFile(samplePath);
    expect(sourceFile).toBeTruthy();
    const text = sourceFile!.getFullText();
    // First "Icon" in `import Icon from ...`
    const pos = positionOf(text, 'Icon');

    const result = trySpikeAssetDefinition(
      ts as unknown as typeof import('typescript/lib/tsserverlibrary'),
      program,
      samplePath,
      pos,
    );

    expect(result).toBeTruthy();
    expect(result!.definitions).toHaveLength(1);
    expect(result!.definitions[0].fileName.replace(/\\/g, '/')).toBe(
      path.join(fixtureDir, 'icon.svg').replace(/\\/g, '/'),
    );
    expect(fs.existsSync(result!.definitions[0].fileName)).toBe(true);
  });

  it('rewrites definition on module specifier ./icon.svg?react', () => {
    const program = createProgram();
    const sourceFile = program.getSourceFile(samplePath)!;
    const text = sourceFile.getFullText();
    const pos = positionOf(text, PHASE0_SVG_SPECIFIER) + 2;

    const result = trySpikeAssetDefinition(
      ts as unknown as typeof import('typescript/lib/tsserverlibrary'),
      program,
      samplePath,
      pos,
    );

    expect(result).toBeTruthy();
    expect(result!.definitions[0].fileName.replace(/\\/g, '/')).toContain(
      'icon.svg',
    );
  });

  it('passes through normal local symbol (helper)', () => {
    const program = createProgram();
    const sourceFile = program.getSourceFile(samplePath)!;
    const text = sourceFile.getFullText();
    // position on function name `helper` in the export declaration
    const pos = positionOf(text, 'function helper') + 'function '.length;

    const result = trySpikeAssetDefinition(
      ts as unknown as typeof import('typescript/lib/tsserverlibrary'),
      program,
      samplePath,
      pos,
    );

    expect(result).toBeUndefined();
  });

  it('passes through SCSS module import (not Phase 0 intercept target)', () => {
    const program = createProgram();
    const sourceFile = program.getSourceFile(samplePath)!;
    const text = sourceFile.getFullText();
    const pos = positionOf(text, 'styles');

    const result = trySpikeAssetDefinition(
      ts as unknown as typeof import('typescript/lib/tsserverlibrary'),
      program,
      samplePath,
      pos,
    );

    expect(result).toBeUndefined();
  });
});
