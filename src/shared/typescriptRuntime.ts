import type ts from 'typescript';

/**
 * Runtime `typescript` module used by the shared layer.
 *
 * Inside tsserver the plugin injects tsserver's own module (`setTypeScript`), so
 * its `SourceFile`s are inspected with the same TypeScript build and no second
 * copy is loaded. The extension host falls back to the packaged dependency.
 */
let current: typeof ts | undefined;

export function setTypeScript(typescript: typeof ts | undefined): void {
  current = typescript;
}

export function getTypeScript(): typeof ts {
  if (!current) {
    // Lazy so tsserver never loads the packaged copy once injected.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    current = require('typescript') as typeof ts;
  }
  return current;
}
