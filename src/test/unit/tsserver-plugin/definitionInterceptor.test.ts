import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLUGIN_NAV_CONFIG,
  type PluginNavConfig,
} from '../../../tsserver-plugin/configuration';
import { DEFINITION_OVERRIDE_METHODS } from '../../../tsserver-plugin/languageServiceProxy';
import {
  createLanguageServiceForFixture,
  createProgramFromFixture,
  norm,
  positionOf,
  tryRewrite,
} from './testUtils';

const fixtureDir = path.resolve(__dirname, '../../fixtures/vite-svg-react');
const appPath = path.join(fixtureDir, 'App.tsx');

describe('definitionInterceptor Mode A', () => {
  it('AC-3.6: override method list is exactly Phase 0 measured pair', () => {
    expect([...DEFINITION_OVERRIDE_METHODS]).toEqual([
      'getDefinitionAndBoundSpan',
      'getDefinitionAtPosition',
    ]);
  });

  it('AC-3.1 / NAV-02: SVG ?react identifier → physical icon.svg', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, 'Icon');
    const result = tryRewrite(program, appPath, pos);
    expect(result).toBeTruthy();
    expect(norm(result!.definitions[0].fileName)).toBe(
      norm(path.join(fixtureDir, 'icon.svg')),
    );
    expect(norm(result!.definitions[0].fileName).endsWith('client.d.ts')).toBe(
      false,
    );
  });

  it('AC-3.1 / NAV-01: plain SVG import → physical logo.svg', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, 'logo');
    const result = tryRewrite(program, appPath, pos);
    expect(result).toBeTruthy();
    expect(norm(result!.definitions[0].fileName)).toBe(
      norm(path.join(fixtureDir, 'logo.svg')),
    );
  });

  it('AC-3.1: specifier position also rewrites', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, './icon.svg?react') + 2;
    const result = tryRewrite(program, appPath, pos);
    expect(result).toBeTruthy();
    expect(norm(result!.definitions[0].fileName).endsWith('icon.svg')).toBe(
      true,
    );
  });

  it('AC-3.2 / NAV-04: CSS module → physical stylesheet', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, 'styles');
    const result = tryRewrite(program, appPath, pos);
    expect(result).toBeTruthy();
    expect(norm(result!.definitions[0].fileName)).toBe(
      norm(path.join(fixtureDir, 'Card.module.css')),
    );
  });

  it('AC-3.2 / NAV-05: SCSS module → physical stylesheet', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, 'scss');
    const result = tryRewrite(program, appPath, pos);
    expect(result).toBeTruthy();
    expect(norm(result!.definitions[0].fileName)).toBe(
      norm(path.join(fixtureDir, 'Card.module.scss')),
    );
  });

  it('AC-3.4 / RES-06: missing asset → no rewrite (delegate)', () => {
    const missPath = path.join(fixtureDir, 'missing-import.tsx');
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(missPath, 'utf8');
    const pos = positionOf(text, 'Ghost');
    const result = tryRewrite(program, missPath, pos);
    expect(result).toBeUndefined();
  });

  it('disabled config → no rewrite', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, 'Icon');
    const config: PluginNavConfig = {
      ...DEFAULT_PLUGIN_NAV_CONFIG,
      enabled: false,
    };
    expect(tryRewrite(program, appPath, pos, config)).toBeUndefined();
  });

  it('extensions filter excludes scss when not allowed', () => {
    const program = createProgramFromFixture(fixtureDir);
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, 'scss');
    const config: PluginNavConfig = {
      ...DEFAULT_PLUGIN_NAV_CONFIG,
      extensions: ['.svg', '.css'],
    };
    expect(tryRewrite(program, appPath, pos, config)).toBeUndefined();
  });

  it('baseline ambient without rewrite lands in client.d.ts', () => {
    const { service } = createLanguageServiceForFixture(fixtureDir);
    const text = fs.readFileSync(appPath, 'utf8');
    const pos = positionOf(text, 'Icon');
    const defs = service.getDefinitionAtPosition(appPath, pos);
    expect(defs?.length).toBeGreaterThan(0);
    expect(norm(defs![0].fileName).endsWith('client.d.ts')).toBe(true);
  });
});
