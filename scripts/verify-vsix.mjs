/**
 * Package audit (AC-7.10): assert a built .vsix contains the runtime files the
 * extension and the Mode A tsserver plugin need, and nothing that must not ship.
 *
 * Usage: node scripts/verify-vsix.mjs <path/to/extension.vsix>
 */
import { readFileSync } from 'node:fs';

const REQUIRED = [
  'extension/package.json',
  'extension/out/extension/extension.js',
  'extension/out/tsserver-plugin/index.js',
  'extension/node_modules/asset-import-navigator-ts-plugin/package.json',
  'extension/node_modules/typescript/lib/typescript.js',
];

const FORBIDDEN = [
  { re: /^extension\/src\//, why: 'TypeScript sources' },
  { re: /^extension\/docs\//, why: 'internal docs' },
  { re: /^extension\/examples\//, why: 'example projects' },
  { re: /^extension\/out\/test\//, why: 'compiled tests' },
  { re: /fixtures\//, why: 'test fixtures' },
  { re: /(^|\/)\.env/, why: 'environment files' },
  { re: /\.map$/, why: 'source maps' },
  { re: /\.log$/, why: 'log files' },
  { re: /^extension\/out\/.*\.ts$/, why: 'TypeScript sources in out/' },
];

/** List entry names from the zip central directory (no dependencies). */
function zipEntries(buf) {
  const EOCD = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error('not a zip file (no end of central directory)');
  }
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const names = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) {
      throw new Error('corrupt central directory');
    }
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    names.push(buf.toString('utf8', p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/verify-vsix.mjs <file.vsix>');
  process.exit(2);
}

const buf = readFileSync(file);
const entries = zipEntries(buf);
const set = new Set(entries);
const problems = [];

for (const req of REQUIRED) {
  if (!set.has(req)) {
    problems.push(`missing required: ${req}`);
  }
}
for (const name of entries) {
  for (const { re, why } of FORBIDDEN) {
    if (re.test(name)) {
      problems.push(`forbidden (${why}): ${name}`);
    }
  }
}

console.log(`${file}: ${entries.length} entries, ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
if (problems.length > 0) {
  for (const p of problems) {
    console.error(`  ✗ ${p}`);
  }
  process.exit(1);
}
console.log('  ✓ required runtime files present; no forbidden files');
