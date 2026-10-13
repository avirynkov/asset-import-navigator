# Contributing

Thanks for helping improve Asset Import Navigator. Please read this before you open a pull request.

## Setup

Requires Node.js 22 or later.

```bash
npm ci
npm run compile
```

Press **F5** in VS Code and choose **Extension Development Host (vite-svg-react)** to run the extension against a fixture.

## Architecture

```text
src/
  tsserver-plugin/   Mode A: TypeScript server plugin that rewrites definition results for asset imports
  extension/         VS Code extension host: hover, document links, fallback definition, config, debug output
  shared/            Environment-neutral core: AST detection, specifier parsing, resolution, classification
  preview/           SVG/stylesheet metadata, SVG sanitizer, hover Markdown (no vscode import)
  platform/          File-system adapters: vscode.workspace.fs and the tsserver host
```

Rules that keep the extension safe to run alongside TypeScript:

- `shared/` and `preview/` must not import `vscode`.
- Detect imports with the TypeScript AST only. Never use regex parsing of source code.
- Every provider and interceptor returns *nothing* outside an exact supported asset import. Never filter `.d.ts` results globally.
- Never execute project code (for example `vite.config.ts`). Never scan the workspace recursively.
- Prefer false negatives. A missing file means no result, never a guessed one.
- The public shapes in `shared/model/` are frozen. Changing them needs fixtures and tests in the same PR.

The full design, including the Mode A / Mode B truth table and the acceptance-criteria IDs (NAV-, HOV-, RES-, NINT-, COMPAT-…), is in [docs/asset-import-navigator-implementation-plan.md](docs/asset-import-navigator-implementation-plan.md).

## Tests

| Command | What it runs |
|---|---|
| `npm run lint` | ESLint (recommended rules + typescript-eslint) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: unit tests, core integration, compatibility (non-interference, performance), and `examples/` validation |
| `npm run test:e2e` | `@vscode/test-cli`: launches VS Code on the fixtures and checks real definition, link and hover results |
| `npm run probe:tsserver` | Drives a classic tsserver with the plugin to confirm Mode A loads and rewrites |
| `npm run package` then `node scripts/verify-vsix.mjs *.vsix` | Builds the VSIX and checks its contents |

Every behavior change needs:

1. A positive test for the new behavior.
2. A **negative / non-interference test** showing ordinary TypeScript navigation is unchanged.
3. An update to `examples/` and the README if user-visible behavior changes.

Things the automated tests can't reach (Cmd/Ctrl+Click UI, native TypeScript, other extensions, remote) are listed in [src/test/e2e/MANUAL-CHECKLIST.md](src/test/e2e/MANUAL-CHECKLIST.md).

## Pull requests

- Keep a PR to one change. Don't mix refactors into feature or fix PRs.
- Fill in the PR template checklist.
- CI must pass: lint, typecheck, unit/integration, E2E on macOS/Windows/Linux, and the VSIX package audit.

## Reporting issues

Use the issue forms (bug, compatibility, feature). For compatibility problems, include the output of the **Asset Import Navigator** output channel with `"assetImportNavigator.debug": true`.

Report security issues privately; see [SECURITY.md](SECURITY.md).
