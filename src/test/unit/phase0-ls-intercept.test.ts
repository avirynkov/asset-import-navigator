/**
 * Language-service level proof that the Phase 0 proxy replaces ambient
 * `*.svg?react` definitions with the physical SVG (AC-0.1 technical core).
 * VS Code F12 / plugin-load confirmation is recorded separately in findings.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { trySpikeAssetDefinition } from '../../tsserver-plugin/definitionSpike';

const fixtureDir = path.resolve(__dirname, '../fixtures/phase0');
const samplePath = path.join(fixtureDir, 'sample.tsx');

function createLanguageService(): {
  service: ts.LanguageService;
  program: ts.Program;
} {
  const files = new Map<string, string>();
  for (const name of ['sample.tsx', 'client.d.ts']) {
    const full = path.join(fixtureDir, name);
    files.set(full, fs.readFileSync(full, 'utf8'));
  }

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
  };

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [...files.keys()],
    getScriptVersion: () => '1',
    getScriptSnapshot: (fileName) => {
      const text = files.get(fileName) ?? fs.readFileSync(fileName, 'utf8');
      return ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => fixtureDir,
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };

  const service = ts.createLanguageService(host);
  return { service, program: service.getProgram()! };
}

describe('phase0 LS intercept (ambient → physical SVG)', () => {
  it('baseline without spike: definition lands in client.d.ts', () => {
    const { service } = createLanguageService();
    const text = fs.readFileSync(samplePath, 'utf8');
    const pos = text.indexOf('Icon');
    const defs = service.getDefinitionAtPosition(samplePath, pos);
    expect(defs?.length).toBeGreaterThan(0);
    const primary = defs![0].fileName.replace(/\\/g, '/');
    expect(primary.endsWith('client.d.ts')).toBe(true);
  });

  it('with spike: primary definition is physical icon.svg', () => {
    const { service, program } = createLanguageService();
    const text = fs.readFileSync(samplePath, 'utf8');
    const pos = text.indexOf('Icon');

    const spike = trySpikeAssetDefinition(
      ts as unknown as typeof import('typescript/lib/tsserverlibrary'),
      program,
      samplePath,
      pos,
    );
    expect(spike).toBeTruthy();

    // Simulate proxy replace: spike wins over ambient
    const primary = spike!.definitions[0].fileName.replace(/\\/g, '/');
    expect(primary.endsWith('icon.svg')).toBe(true);
    expect(primary.endsWith('client.d.ts')).toBe(false);

    // Pass-through still works for helper
    const helperPos = text.indexOf('function helper') + 'function '.length;
    const helperSpike = trySpikeAssetDefinition(
      ts as unknown as typeof import('typescript/lib/tsserverlibrary'),
      program,
      samplePath,
      helperPos,
    );
    expect(helperSpike).toBeUndefined();
    const helperDefs = service.getDefinitionAtPosition(samplePath, helperPos);
    expect(helperDefs?.[0].fileName.replace(/\\/g, '/')).toContain('sample.tsx');
  });
});
