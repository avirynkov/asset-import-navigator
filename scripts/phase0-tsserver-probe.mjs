/**
 * Drive classic tsserver with --globalPlugins to prove plugin load +
 * definition rewrite for Phase 0 (AC-0.1 via tsserver protocol).
 *
 * Modern tsserver reads newline-delimited JSON on stdin (no Content-Length).
 */
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fixtureDir = path.join(root, 'src/test/fixtures/phase0');
const samplePath = path.join(fixtureDir, 'sample.tsx');
const tsserverJs = path.join(root, 'node_modules/typescript/lib/tsserver.js');
const logFile = path.join(fixtureDir, '.tsserver-probe.log');
const outPath = path.join(fixtureDir, '.phase0-tsserver-probe.json');

if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
}

const sampleText = fs.readFileSync(samplePath, 'utf8');
const iconPos = sampleText.indexOf('Icon'); // 0-based in file; line 1

const seqRef = { n: 0 };
function nextSeq() {
  seqRef.n += 1;
  return seqRef.n;
}

const child = spawn(
  process.execPath,
  [
    tsserverJs,
    '--globalPlugins',
    'asset-import-navigator-ts-plugin',
    '--pluginProbeLocations',
    root,
    '--logVerbosity',
    'verbose',
    '--logFile',
    logFile,
  ],
  {
    cwd: fixtureDir,
    env: {
      ...process.env,
      NODE_PATH: path.join(root, 'node_modules'),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  },
);

const pending = new Map();
let stdoutBuffer = '';

child.stdout.on('data', (chunk) => {
  stdoutBuffer += chunk.toString('utf8');
  while (true) {
    const headerEnd = stdoutBuffer.indexOf('\r\n\r\n');
    if (headerEnd < 0) break;
    const header = stdoutBuffer.slice(0, headerEnd);
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      stdoutBuffer = stdoutBuffer.slice(headerEnd + 4);
      continue;
    }
    const len = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (stdoutBuffer.length < bodyStart + len) break;
    const body = stdoutBuffer.slice(bodyStart, bodyStart + len);
    stdoutBuffer = stdoutBuffer.slice(bodyStart + len);
    let msg;
    try {
      msg = JSON.parse(body);
    } catch {
      continue;
    }
    if (msg.type === 'response' && pending.has(msg.request_seq)) {
      const { resolve } = pending.get(msg.request_seq);
      pending.delete(msg.request_seq);
      resolve(msg);
    }
  }
});

function request(command, args) {
  const seq = nextSeq();
  const msg = { seq, type: 'request', command, arguments: args };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(seq);
      reject(new Error(`timeout waiting for ${command} seq=${seq}`));
    }, 20000);
    pending.set(seq, {
      resolve: (m) => {
        clearTimeout(timer);
        resolve(m);
      },
    });
    child.stdin.write(`${JSON.stringify(msg)}\n`);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readLog() {
  if (!fs.existsSync(logFile)) return '';
  return fs.readFileSync(logFile, 'utf8');
}

async function main() {
  await request('configure', {
    hostInfo: 'phase0-probe',
  });

  await request('updateOpen', {
    openFiles: [
      {
        file: samplePath,
        projectRootPath: fixtureDir,
      },
    ],
  });

  await sleep(2000);

  // line/offset are 1-based for tsserver
  const defBound = await request('definitionAndBoundSpan', {
    file: samplePath,
    line: 1,
    offset: iconPos + 1,
  });

  const def = await request('definition', {
    file: samplePath,
    line: 1,
    offset: iconPos + 1,
  });

  const helperLineIdx = sampleText
    .split('\n')
    .findIndex((l) => l.includes('function helper'));
  const helperCol =
    sampleText.split('\n')[helperLineIdx].indexOf('helper') + 1;

  const helperDef = await request('definitionAndBoundSpan', {
    file: samplePath,
    line: helperLineIdx + 1,
    offset: helperCol,
  });

  const log = readLog();
  const pluginCreateSeen =
    log.includes('[asset-import-navigator-ts-plugin] create()') ||
    /Loading .+asset-import-navigator-ts-plugin/.test(log) ||
    log.includes('asset-import-navigator-ts-plugin');

  const methodHits = [
    ...log.matchAll(
      /\[asset-import-navigator-ts-plugin\] (getDefinitionAndBoundSpan|getDefinitionAtPosition|getTypeDefinitionAtPosition)/g,
    ),
  ].map((m) => m[1]);

  const primaryFromBound = defBound?.body?.definitions?.[0]?.file;
  const primaryFromDef = Array.isArray(def?.body) ? def.body[0]?.file : undefined;
  const primary = primaryFromBound || primaryFromDef;
  const helperFile = helperDef?.body?.definitions?.[0]?.file;

  const summary = {
    pluginCreateSeen,
    methodHits: [...new Set(methodHits)],
    primaryFile: primary,
    helperFile,
    definitionAndBoundSpanSuccess: defBound?.success,
    definitionSuccess: def?.success,
    ac01Pass: Boolean(
      primary && String(primary).replace(/\\/g, '/').endsWith('icon.svg'),
    ),
    helperStillLocal: Boolean(
      helperFile &&
        String(helperFile).replace(/\\/g, '/').endsWith('sample.tsx'),
    ),
    logPluginLines: [...log.matchAll(/.*asset-import-navigator-ts-plugin.*/g)]
      .map((m) => m[0])
      .slice(0, 40),
  };

  fs.writeFileSync(
    outPath,
    JSON.stringify({ summary, defBound, def, helperDef }, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));

  child.stdin.end();
  child.kill();

  if (!summary.ac01Pass) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  try {
    console.error('log tail:\n', readLog().slice(-3000));
  } catch {
    /* ignore */
  }
  child.kill();
  process.exit(1);
});
