import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createProgramFromFixture,
  norm,
  positionOf,
  tryRewrite,
} from './tsserver-plugin/testUtils';

const fixtureDir = path.resolve(__dirname, '../fixtures/phase0');
const samplePath = path.join(fixtureDir, 'sample.tsx');

describe('phase0 Mode A interceptor (migrated from spike)', () => {
  it('rewrites definition on Icon identifier for ./icon.svg?react', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(samplePath, 'utf8');
    const pos = positionOf(text, 'Icon');

    const result = tryRewrite(program, samplePath, pos);

    expect(result).toBeTruthy();
    expect(result!.definitions).toHaveLength(1);
    expect(norm(result!.definitions[0].fileName)).toBe(
      norm(path.join(fixtureDir, 'icon.svg')),
    );
    expect(fs.existsSync(result!.definitions[0].fileName)).toBe(true);
  });

  it('rewrites definition on module specifier ./icon.svg?react', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(samplePath, 'utf8');
    const pos = positionOf(text, './icon.svg?react') + 2;

    const result = tryRewrite(program, samplePath, pos);

    expect(result).toBeTruthy();
    expect(norm(result!.definitions[0].fileName).endsWith('icon.svg')).toBe(
      true,
    );
  });

  it('passes through normal local symbol (helper)', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(samplePath, 'utf8');
    const pos = positionOf(text, 'function helper') + 'function '.length;

    expect(tryRewrite(program, samplePath, pos)).toBeUndefined();
  });

  it('AC-3.2: rewrites SCSS module import to physical stylesheet', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(samplePath, 'utf8');
    const pos = positionOf(text, 'styles');

    const result = tryRewrite(program, samplePath, pos);

    expect(result).toBeTruthy();
    expect(norm(result!.definitions[0].fileName)).toBe(
      norm(path.join(fixtureDir, 'Card.module.scss')),
    );
  });
});
