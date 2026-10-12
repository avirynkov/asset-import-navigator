/**
 * Language-service level proof that Mode A rewrite replaces ambient
 * `*.svg?react` definitions with the physical SVG (AC-0.1 / AC-3.1 core).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createLanguageServiceForFixture,
  positionOf,
  tryRewrite,
} from './tsserver-plugin/testUtils';

const fixtureDir = path.resolve(__dirname, '../fixtures/phase0');
const samplePath = path.join(fixtureDir, 'sample.tsx');

describe('phase0 LS intercept (ambient → physical SVG)', () => {
  it('baseline without rewrite: definition lands in client.d.ts', () => {
    const { service } = createLanguageServiceForFixture(fixtureDir);
    const text = fs.readFileSync(samplePath, 'utf8');
    const pos = positionOf(text, 'Icon');
    const defs = service.getDefinitionAtPosition(samplePath, pos);
    expect(defs?.length).toBeGreaterThan(0);
    const primary = defs![0].fileName.replace(/\\/g, '/');
    expect(primary.endsWith('client.d.ts')).toBe(true);
  });

  it('with interceptor: primary definition is physical icon.svg', () => {
    const { service, program } = createLanguageServiceForFixture(fixtureDir);
    const text = fs.readFileSync(samplePath, 'utf8');
    const pos = positionOf(text, 'Icon');

    const rewrite = tryRewrite(program, samplePath, pos);
    expect(rewrite).toBeTruthy();

    const primary = rewrite!.definitions[0].fileName.replace(/\\/g, '/');
    expect(primary.endsWith('icon.svg')).toBe(true);
    expect(primary.endsWith('client.d.ts')).toBe(false);

    const helperPos = positionOf(text, 'function helper') + 'function '.length;
    expect(tryRewrite(program, samplePath, helperPos)).toBeUndefined();
    const helperDefs = service.getDefinitionAtPosition(samplePath, helperPos);
    expect(helperDefs?.[0].fileName.replace(/\\/g, '/')).toContain('sample.tsx');
  });
});
