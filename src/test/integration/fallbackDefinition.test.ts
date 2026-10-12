import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  resolveAssetDefinitionAt,
  createResolutionCache,
} from '../../extension/assetNavigationCore';
import { createTsserverFileSystem } from '../../platform/tsserverFileSystem';
import { DEFAULT_EXTENSIONS } from '../../tsserver-plugin/configuration';
import { normalizePath } from '../../shared/resolution/pathUtils';

const FIXTURES = path.resolve(__dirname, '../fixtures');

function nodeHost() {
  return createTsserverFileSystem({
    fileExists: (p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
      } catch {
        return false;
      }
    },
    readFile: (p) => {
      try {
        return fs.readFileSync(p, 'utf8');
      } catch {
        return undefined;
      }
    },
  });
}

function offsetOf(text: string, needle: string): number {
  const i = text.indexOf(needle);
  if (i < 0) {
    throw new Error(`needle not found: ${needle}`);
  }
  return i;
}

describe('fallbackDefinition resolveAssetDefinitionAt', () => {
  it('fallback: asset specifier and binding → physical file', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'App.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const host = nodeHost();
    const cache = createResolutionCache();
    const base = {
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host,
      cache,
    };

    const onSpec = await resolveAssetDefinitionAt({
      ...base,
      position: offsetOf(text, './icon.svg?react'),
    });
    expect(onSpec?.targetPath).toBe(
      normalizePath(path.join(root, 'icon.svg')),
    );

    const onBinding = await resolveAssetDefinitionAt({
      ...base,
      position: offsetOf(text, 'Icon'),
    });
    expect(onBinding?.targetPath).toBe(
      normalizePath(path.join(root, 'icon.svg')),
    );

    const onCss = await resolveAssetDefinitionAt({
      ...base,
      position: offsetOf(text, './Card.module.css'),
    });
    expect(onCss?.targetPath).toBe(
      normalizePath(path.join(root, 'Card.module.css')),
    );
  });

  it('fallback: normal TS / non-asset positions → undefined (NINT-01)', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'App.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const base = {
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    };

    expect(
      await resolveAssetDefinitionAt({
        ...base,
        position: offsetOf(text, 'helper'),
      }),
    ).toBeUndefined();

    expect(
      await resolveAssetDefinitionAt({
        ...base,
        position: offsetOf(text, 'localValue'),
      }),
    ).toBeUndefined();

    // Non-asset module import
    const nintRoot = path.join(FIXTURES, 'nint-suite');
    const nintFile = normalizePath(path.join(nintRoot, 'symbols.ts'));
    if (fs.existsSync(nintFile)) {
      const nintText = fs.readFileSync(nintFile, 'utf8');
      // Prefer a position on a normal identifier if present
      const pos = nintText.indexOf('export');
      expect(
        await resolveAssetDefinitionAt({
          text: nintText,
          fileName: nintFile,
          scriptKind: ts.ScriptKind.TS,
          version: 1,
          position: pos >= 0 ? pos : 0,
          enabled: true,
          extensions: DEFAULT_EXTENSIONS,
          queryPolicySupported: true,
          aliases: {},
          host: nodeHost(),
        }),
      ).toBeUndefined();
    }
  });

  it('fallback: missing asset → undefined (RES-06)', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'missing-import.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const result = await resolveAssetDefinitionAt({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      position: offsetOf(text, './does-not-exist.svg'),
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });
    expect(result).toBeUndefined();
  });
});
