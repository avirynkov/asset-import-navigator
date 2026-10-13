/**
 * VSIX install smoke (AC-7.6, automated part): install the packaged .vsix into a
 * brand-new extensions/user-data dir with the VS Code CLI, confirm it is listed,
 * and confirm the installed copy can load the Mode A tsserver plugin the way
 * tsserver does (resolve by package name from the extension directory).
 *
 * Usage: node scripts/vsix-install-smoke.mjs <path/to/extension.vsix>
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath } from '@vscode/test-electron';

const EXTENSION_ID = 'avirynkov.asset-import-navigator';
const PLUGIN = 'asset-import-navigator-ts-plugin';

const vsix = process.argv[2];
if (!vsix) {
  console.error('usage: node scripts/vsix-install-smoke.mjs <file.vsix>');
  process.exit(2);
}

const exe = await downloadAndUnzipVSCode('stable');
const cli = resolveCliPathFromVSCodeExecutablePath(exe);
const profile = mkdtempSync(path.join(tmpdir(), 'ain-vsix-'));
const extDir = path.join(profile, 'extensions');
const base = [`--extensions-dir=${extDir}`, `--user-data-dir=${path.join(profile, 'user-data')}`];

function code(args) {
  const res = spawnSync(cli, [...base, ...args], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) {
    throw new Error(`code ${args.join(' ')} failed (${res.status}):\n${res.stdout}\n${res.stderr}`);
  }
  return res.stdout;
}

try {
  code(['--install-extension', path.resolve(vsix)]);
  const listed = code(['--list-extensions']).split(/\r?\n/).map((s) => s.trim().toLowerCase());
  if (!listed.includes(EXTENSION_ID)) {
    throw new Error(`${EXTENSION_ID} not listed after install: ${listed.join(', ')}`);
  }
  console.log(`  ✓ installed and listed: ${EXTENSION_ID}`);

  const installed = readdirSync(extDir).find((d) => d.toLowerCase().startsWith(`${EXTENSION_ID}-`));
  if (!installed) {
    throw new Error(`installed extension folder not found in ${extDir}`);
  }
  const root = realpathSync(path.join(extDir, installed));
  const req = createRequire(path.join(root, 'package.json'));

  const pluginMain = req.resolve(PLUGIN);
  const init = req(pluginMain);
  const plugin = init({ typescript: req('typescript') });
  if (typeof plugin.create !== 'function') {
    throw new Error('tsserver plugin init() did not return create()');
  }
  console.log(`  ✓ tsserver plugin resolves from the installed extension: ${path.relative(root, pluginMain)}`);

  const core = req(path.join(root, 'out/extension/assetNavigationCore.js'));
  if (typeof core.collectAssetDocumentLinks !== 'function') {
    throw new Error('extension core did not load');
  }
  console.log('  ✓ extension core loads with the packaged typescript dependency');
} finally {
  rmSync(profile, { recursive: true, force: true });
}
