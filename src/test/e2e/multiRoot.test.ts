/**
 * COMPAT-05: multi-root workspace — each root resolves `@/…` through its own
 * tsconfig and never through a sibling root.
 */
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { basenames, openDocument, positionOf, waitForDefinitions } from './helpers';

suite('E2E multi-root workspace', () => {
  for (const [root, asset] of [
    ['root-a', 'a.svg'],
    ['root-b', 'b.svg'],
  ] as const) {
    test(`${root}: @/ alias → own ${asset}`, async () => {
      const folder = vscode.workspace.workspaceFolders!.find((f) => f.name === root);
      assert.ok(folder, `workspace folder ${root} missing`);
      const doc = await openDocument(vscode.Uri.joinPath(folder.uri, 'src/importer.tsx'));
      const defs = await waitForDefinitions(doc, positionOf(doc, 'icon'), (d) =>
        basenames(d).includes(asset),
      );
      const names = basenames(defs);
      assert.ok(names.includes(asset), `got ${names.join(', ')}`);
      const sibling = asset === 'a.svg' ? 'b.svg' : 'a.svg';
      assert.ok(!names.includes(sibling), `resolved into sibling root: ${names.join(', ')}`);
    });
  }
});
