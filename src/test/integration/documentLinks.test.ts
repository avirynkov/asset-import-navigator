import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  collectAssetDocumentLinks,
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

describe('documentLink collectAssetDocumentLinks', () => {
  it('documentLink: vite-svg-react App.tsx → physical svg/css/scss', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'App.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const links = await collectAssetDocumentLinks({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
      cache: createResolutionCache(),
    });

    const targets = links.map((l) => l.targetPath).sort();
    expect(targets).toEqual(
      [
        normalizePath(path.join(root, 'Card.module.css')),
        normalizePath(path.join(root, 'Card.module.scss')),
        normalizePath(path.join(root, 'icon.svg')),
        normalizePath(path.join(root, 'logo.svg')),
      ].sort(),
    );
  });

  it('documentLink NAV-06: side-effect stylesheet import links to physical file', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'side-effect.tsx'));
    const text = `import './Card.module.scss';\n`;
    const links = await collectAssetDocumentLinks({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });
    expect(links).toHaveLength(1);
    expect(links[0]!.targetPath).toBe(
      normalizePath(path.join(root, 'Card.module.scss')),
    );
  });

  it('documentLink: tsconfig paths alias resolves to physical svg', async () => {
    const root = path.join(FIXTURES, 'aliases');
    const fileName = normalizePath(
      path.join(root, 'src/components/App.tsx'),
    );
    const text = fs.readFileSync(fileName, 'utf8');
    const links = await collectAssetDocumentLinks({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });
    expect(links).toHaveLength(1);
    expect(links[0]!.targetPath).toBe(
      normalizePath(path.join(root, 'src/assets/icon.svg')),
    );
  });

  it('documentLink: missing assets produce no fabricated links (RES-06)', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'missing-import.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const links = await collectAssetDocumentLinks({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });
    expect(links).toEqual([]);

    const missRoot = path.join(FIXTURES, 'missing-assets');
    const relMiss = normalizePath(
      path.join(missRoot, 'src/relative-miss.tsx'),
    );
    const relLinks = await collectAssetDocumentLinks({
      text: fs.readFileSync(relMiss, 'utf8'),
      fileName: relMiss,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });
    expect(relLinks).toEqual([]);
  });

  it('documentLink: disabled / unsupported queryPolicy → no links', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'App.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const base = {
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      extensions: DEFAULT_EXTENSIONS,
      aliases: {},
      host: nodeHost(),
    };
    expect(
      await collectAssetDocumentLinks({
        ...base,
        enabled: false,
        queryPolicySupported: true,
      }),
    ).toEqual([]);
    expect(
      await collectAssetDocumentLinks({
        ...base,
        enabled: true,
        queryPolicySupported: false,
      }),
    ).toEqual([]);
  });
});
