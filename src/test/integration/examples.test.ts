/**
 * DOC-03 examples validation: every documented behavior in examples/ resolves
 * as its README says, through the same core the extension host uses.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  collectAssetDocumentLinks,
  createResolutionCache,
  resolveAssetDefinitionAt,
  scriptKindForLanguageId,
} from '../../extension/assetNavigationCore';
import { createTsserverFileSystem } from '../../platform/tsserverFileSystem';
import { absolutizeAliases, DEFAULT_EXTENSIONS } from '../../tsserver-plugin/configuration';
import { normalizePath } from '../../shared/resolution/pathUtils';

const EXAMPLES = path.resolve(__dirname, '../../../examples');

const host = createTsserverFileSystem({
  fileExists: (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
  readFile: (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : undefined),
});

/** `assetImportNavigator.aliases` from the example's .vscode/settings.json, if any. */
function exampleAliases(example: string): Record<string, string> {
  const settings = path.join(EXAMPLES, example, '.vscode/settings.json');
  if (!fs.existsSync(settings)) {
    return {};
  }
  const raw = JSON.parse(fs.readFileSync(settings, 'utf8'))['assetImportNavigator.aliases'] ?? {};
  return absolutizeAliases(raw, normalizePath(path.join(EXAMPLES, example)));
}

function load(example: string, file: string) {
  const fileName = normalizePath(path.join(EXAMPLES, example, file));
  const text = fs.readFileSync(fileName, 'utf8');
  const languageId = file.endsWith('.tsx') ? 'typescriptreact' : 'typescript';
  return {
    text,
    fileName,
    scriptKind: scriptKindForLanguageId(languageId),
    version: 1,
    enabled: true,
    extensions: DEFAULT_EXTENSIONS,
    queryPolicySupported: true,
    aliases: exampleAliases(example),
    host,
    cache: createResolutionCache(),
  };
}

/** [example, file, needle (first occurrence), expected path relative to the example | undefined] */
const DEFINITIONS: Array<[string, string, string, string | undefined]> = [
  ['vite-react-svg-react', 'src/App.tsx', 'Logo', 'src/assets/logo.svg'],
  ['vite-react-svg-react', 'src/App.tsx', 'Badge', 'src/assets/badge.svg'],
  ['vite-react-svg-url', 'src/main.ts', 'logo ', 'src/assets/logo.svg'],
  ['vite-react-svg-url', 'src/main.ts', 'logoUrl', 'src/assets/logo.svg'],
  ['vite-react-svg-url', 'src/main.ts', 'logoRaw', 'src/assets/logo.svg'],
  ['css-modules', 'src/Card.ts', 'styles', 'src/Card.module.css'],
  ['css-modules', 'src/Card.ts', 'card;', undefined],
  ['scss-modules', 'src/Button.ts', 'styles', 'src/Button.module.scss'],
  ['tsconfig-alias', 'src/components/Header.tsx', 'MenuIcon', 'src/assets/icons/menu.svg'],
  ['tsconfig-alias', 'src/components/Header.tsx', 'styles', 'src/styles/header.module.scss'],
  ['explicit-alias', 'src/main.ts', 'star', 'src/assets/star.svg'],
  ['mixed-assets', 'src/main.ts', 'logo', 'src/assets/logo.svg'],
  ['mixed-assets', 'src/main.ts', 'formatLabel', undefined],
  ['mixed-assets', 'src/main.ts', 'Button', undefined],
  ['mixed-assets', 'src/main.ts', "'/assets/logo.svg'", undefined],
  ['mixed-assets', 'src/main.ts', "fetch('/assets", undefined],
  ['monorepo', 'packages/web/src/App.tsx', 'CheckIcon', 'packages/ui/src/icons/check.svg'],
  ['monorepo', 'packages/web/src/App.tsx', 'styles', 'packages/web/src/App.module.css'],
];

/** [example, file, expected link targets relative to the example] */
const LINKS: Array<[string, string, string[]]> = [
  ['scss-modules', 'src/Button.ts', ['src/Button.module.scss', 'src/global.scss']],
  ['mixed-assets', 'src/main.ts', ['src/assets/logo.svg', 'src/theme.css']],
];

const EXPECTED_EXAMPLES = [
  'vite-react-svg-react',
  'vite-react-svg-url',
  'css-modules',
  'scss-modules',
  'tsconfig-alias',
  'explicit-alias',
  'mixed-assets',
  'monorepo',
];

describe('examples/ validation (DOC-03)', () => {
  it('contains every required example project with a README', () => {
    for (const name of EXPECTED_EXAMPLES) {
      expect(fs.existsSync(path.join(EXAMPLES, name, 'README.md')), name).toBe(true);
    }
    expect(fs.existsSync(path.join(EXAMPLES, 'README.md'))).toBe(true);
  });

  for (const [example, file, needle, expected] of DEFINITIONS) {
    it(`${example}: ${needle.trim()} → ${expected ?? 'no asset target'}`, async () => {
      const opts = load(example, file);
      const position = opts.text.indexOf(needle);
      expect(position, `needle ${needle}`).toBeGreaterThanOrEqual(0);
      const target = await resolveAssetDefinitionAt({ ...opts, position });
      expect(target?.targetPath).toBe(
        expected === undefined ? undefined : normalizePath(path.join(EXAMPLES, example, expected)),
      );
    });
  }

  for (const [example, file, expected] of LINKS) {
    it(`${example}: document links in ${file}`, async () => {
      const links = await collectAssetDocumentLinks(load(example, file));
      expect(links.map((l) => l.targetPath)).toEqual(
        expected.map((e) => normalizePath(path.join(EXAMPLES, example, e))),
      );
    });
  }
});
