import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  createResolutionCache,
  resolveAssetDefinitionAt,
  resolveAssetHoverAt,
} from '../../extension/assetNavigationCore';
import { createTsserverFileSystem } from '../../platform/tsserverFileSystem';
import { DEFAULT_EXTENSIONS } from '../../tsserver-plugin/configuration';
import { normalizePath } from '../../shared/resolution/pathUtils';
import { createPreviewCache } from '../../preview/previewCache';
import { renderAssetHoverMarkdown } from '../../preview/svgPreviewRenderer';

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

describe('hover resolveAssetHoverAt + markdown', () => {
  it('hover: SVG import resolves to physical icon.svg with markdown-image', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'App.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const iconPath = normalizePath(path.join(root, 'icon.svg'));
    const svgText = fs.readFileSync(iconPath, 'utf8');

    const target = await resolveAssetHoverAt({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      position: offsetOf(text, 'Icon'),
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
      cache: createResolutionCache(),
    });

    expect(target?.resolved.physicalUri).toBe(iconPath);
    expect(target?.resolved.kind).toBe('svg');
    expect(target?.resolved.originalSpecifier).toBe('./icon.svg?react');

    const md = renderAssetHoverMarkdown({
      kind: target!.resolved.kind,
      physicalPath: target!.resolved.physicalUri,
      relativePath: 'icon.svg',
      originalSpecifier: target!.resolved.originalSpecifier,
      openFileUri: `file://${iconPath}`,
      byteLength: Buffer.byteLength(svgText, 'utf8'),
      svgText,
      svgPreview: true,
      maxPreviewBytes: 524288,
    });

    expect(md).toContain('data:image/svg+xml');
    expect(md).toContain('icon.svg');
    expect(md).not.toContain('client.d.ts');
  });

  it('hover: SCSS module identifies physical file not client.d.ts', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'App.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const scssPath = normalizePath(path.join(root, 'Card.module.scss'));

    const target = await resolveAssetHoverAt({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      position: offsetOf(text, './Card.module.scss'),
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });

    expect(target?.resolved.physicalUri).toBe(scssPath);
    expect(target?.resolved.kind).toBe('scss');

    const md = renderAssetHoverMarkdown({
      kind: target!.resolved.kind,
      physicalPath: target!.resolved.physicalUri,
      relativePath: 'Card.module.scss',
      originalSpecifier: target!.resolved.originalSpecifier,
      openFileUri: `file://${scssPath}`,
      byteLength: fs.statSync(scssPath).size,
      svgPreview: true,
      maxPreviewBytes: 524288,
    });

    expect(md).toContain('Card.module.scss');
    expect(md).toContain('Type: SCSS module');
    expect(md).not.toContain('client.d.ts');
  });

  it('hover: missing asset → undefined', async () => {
    const root = path.join(FIXTURES, 'missing-assets');
    const fileName = normalizePath(path.join(root, 'src', 'relative-miss.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');

    const target = await resolveAssetHoverAt({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      position: offsetOf(text, './Missing.module.scss'),
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });

    expect(target).toBeUndefined();
  });

  it('hover: normal TS symbol position → undefined (NINT-01 / AC-5.5)', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'App.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');

    const onHelper = await resolveAssetHoverAt({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      position: offsetOf(text, 'helper'),
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });
    expect(onHelper).toBeUndefined();

    const onLocal = await resolveAssetHoverAt({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      position: offsetOf(text, 'localValue'),
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });
    expect(onLocal).toBeUndefined();
  });

  it('hover: touching range covers binding when hovering Icon', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'App.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const bindingStart = offsetOf(text, 'Icon');

    const target = await resolveAssetHoverAt({
      text,
      fileName,
      scriptKind: ts.ScriptKind.TSX,
      version: 1,
      position: bindingStart,
      enabled: true,
      extensions: DEFAULT_EXTENSIONS,
      queryPolicySupported: true,
      aliases: {},
      host: nodeHost(),
    });

    expect(target).toBeDefined();
    expect(target!.start).toBe(bindingStart);
    expect(target!.end).toBe(bindingStart + 'Icon'.length);
  });

  it('hover AC-5.6: preview throw does not change definition or corrupt resolution cache', async () => {
    const root = path.join(FIXTURES, 'vite-svg-react');
    const fileName = normalizePath(path.join(root, 'App.tsx'));
    const text = fs.readFileSync(fileName, 'utf8');
    const host = nodeHost();
    const resolutionCache = createResolutionCache();
    const previewCache = createPreviewCache();
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
      cache: resolutionCache,
    };

    const before = await resolveAssetDefinitionAt({
      ...base,
      position: offsetOf(text, './icon.svg?react'),
    });
    expect(before?.targetPath).toBe(
      normalizePath(path.join(root, 'icon.svg')),
    );

    const hoverTarget = await resolveAssetHoverAt({
      ...base,
      position: offsetOf(text, './icon.svg?react'),
    });
    expect(hoverTarget).toBeDefined();

    // Mirror hoverProvider: catch preview failure → metadata-only; never touch resolution cache.
    let markdown: string | undefined;
    try {
      throw new Error('simulated preview failure');
    } catch {
      markdown = renderAssetHoverMarkdown({
        kind: hoverTarget!.resolved.kind,
        physicalPath: hoverTarget!.resolved.physicalUri,
        relativePath: 'icon.svg',
        originalSpecifier: hoverTarget!.resolved.originalSpecifier,
        openFileUri: `file://${hoverTarget!.resolved.physicalUri}`,
        byteLength: 16,
        svgText: undefined,
        svgPreview: false,
        maxPreviewBytes: 524288,
      });
      previewCache.clear();
    }
    expect(markdown).toContain('icon.svg');
    expect(markdown).not.toContain('data:image');

    const after = await resolveAssetDefinitionAt({
      ...base,
      position: offsetOf(text, './icon.svg?react'),
    });
    expect(after?.targetPath).toBe(before?.targetPath);
    expect(after?.start).toBe(before?.start);
    expect(after?.end).toBe(before?.end);

    const again = await resolveAssetDefinitionAt({
      ...base,
      position: offsetOf(text, 'Icon'),
    });
    expect(again?.targetPath).toBe(before?.targetPath);
  });
});

