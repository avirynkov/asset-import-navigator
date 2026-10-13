import { defineConfig } from '@vscode/test-cli';

const mocha = {
  ui: 'tdd',
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
};

// Real VS Code E2E smoke (C.1). Uses VS Code's bundled TypeScript, so the
// Mode A tsserver plugin path is exercised exactly as users get it.
export default defineConfig([
  {
    label: 'vite-svg-react',
    files: 'out/test/e2e/viteSvgReact.test.js',
    workspaceFolder: './src/test/fixtures/vite-svg-react',
    version: 'stable',
    launchArgs: ['--disable-extensions'],
    mocha,
  },
  {
    label: 'multi-root',
    files: 'out/test/e2e/multiRoot.test.js',
    workspaceFolder: './src/test/fixtures/multi-root-like/multi-root.code-workspace',
    version: 'stable',
    launchArgs: ['--disable-extensions'],
    mocha,
  },
]);
