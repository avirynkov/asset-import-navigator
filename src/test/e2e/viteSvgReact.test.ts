/**
 * Real VS Code E2E smoke on `src/test/fixtures/vite-svg-react` with VS Code's
 * bundled TypeScript (Mode A expected). Manual-only checks live in
 * MANUAL-CHECKLIST.md.
 */
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
  basenames,
  definitionsAt,
  hoverText,
  openDocument,
  positionOf,
  waitForDefinitions,
} from './helpers';

suite('E2E vite-svg-react (bundled TypeScript)', () => {
  let doc: vscode.TextDocument;

  suiteSetup(async () => {
    const folder = vscode.workspace.workspaceFolders![0]!.uri;
    doc = await openDocument(vscode.Uri.joinPath(folder, 'App.tsx'));
    // Readiness: tsserver answers ordinary navigation (helper call → its declaration).
    const ready = await waitForDefinitions(
      doc,
      positionOf(doc, 'helper()', 1),
      (defs) => basenames(defs).includes('App.tsx'),
    );
    assert.ok(ready.length > 0, 'tsserver did not become ready');
  });

  test('NAV-02 / NAV-09: Icon (?react) → icon.svg, no client.d.ts (plugin rewrite)', async () => {
    const defs = await waitForDefinitions(
      doc,
      positionOf(doc, 'Icon'),
      (d) => !basenames(d).includes('client.d.ts') && basenames(d).includes('icon.svg'),
    );
    const names = basenames(defs);
    assert.ok(names.includes('icon.svg'), `got ${names.join(', ')}`);
    assert.ok(!names.includes('client.d.ts'), `ambient target leaked: ${names.join(', ')}`);
    const svgCount = names.filter((n) => n === 'icon.svg').length;
    // Measured, not asserted: whether peek shows duplicates is a UI concern (manual checklist).
    console.log(`[e2e] Icon definition results: ${names.join(', ')} (icon.svg x${svgCount})`);
  });

  test('NAV-02: module specifier ./icon.svg?react → icon.svg', async () => {
    const names = basenames(await definitionsAt(doc, positionOf(doc, "'./icon.svg?react'", 0, 2)));
    assert.ok(names.includes('icon.svg'), `got ${names.join(', ')}`);
  });

  test('NAV-01: logo (plain .svg) → logo.svg', async () => {
    const names = basenames(await definitionsAt(doc, positionOf(doc, 'logo')));
    assert.ok(names.includes('logo.svg'), `got ${names.join(', ')}`);
    assert.ok(!names.includes('client.d.ts'), `ambient target leaked: ${names.join(', ')}`);
  });

  test('NAV-04 / NAV-05: CSS and SCSS module imports → physical stylesheets', async () => {
    const css = basenames(await definitionsAt(doc, positionOf(doc, 'styles')));
    const scss = basenames(await definitionsAt(doc, positionOf(doc, 'scss')));
    assert.ok(css.includes('Card.module.css'), `css got ${css.join(', ')}`);
    assert.ok(scss.includes('Card.module.scss'), `scss got ${scss.join(', ')}`);
  });

  test('NAV-07: document links target the physical files', async () => {
    const links =
      (await vscode.commands.executeCommand<vscode.DocumentLink[]>(
        'vscode.executeLinkProvider',
        doc.uri,
      )) ?? [];
    const targets = links.map((l) => l.target?.path.split('/').pop());
    for (const expected of ['icon.svg', 'logo.svg', 'Card.module.css', 'Card.module.scss']) {
      assert.ok(targets.includes(expected), `missing link to ${expected}: ${targets.join(', ')}`);
    }
  });

  test('HOV-01 / HOV-02: SVG hover shows preview and physical path', async () => {
    const text = await hoverText(doc, positionOf(doc, 'Icon'));
    assert.ok(text.includes('icon.svg'), `hover: ${text}`);
    assert.ok(text.includes('data:image/svg+xml'), 'expected markdown-image preview');
  });

  test('HOV-03: SCSS hover shows the physical module file', async () => {
    const text = await hoverText(doc, positionOf(doc, 'scss'));
    assert.ok(text.includes('Card.module.scss'), `hover: ${text}`);
  });

  test('NINT-01: ordinary symbol navigation is unchanged', async () => {
    const names = basenames(await definitionsAt(doc, positionOf(doc, 'helper()', 1)));
    assert.deepStrictEqual(names, ['App.tsx']);
  });
});
