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

Mode A / Mode B behavior and limitations are documented in the [README Compatibility section](README.md#compatibility-mode-a-and-mode-b).

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
- Prefer [Conventional Commits](https://www.conventionalcommits.org/) in the PR title (and squash commit message). release-please uses these to decide the next version and to write the changelog:
  - `feat:` → minor (or patch while still `< 1.0.0` with our pre-major settings)
  - `fix:` → patch
  - `feat!:` / `BREAKING CHANGE:` → minor while `< 1.0.0`, then major after 1.0.0
  - `chore:`, `docs:`, `ci:`, `test:` → usually no version bump on their own
- Issue labels such as `skip-changelog` / `breaking` are for triage only; they no longer drive release notes (that was Release Drafter).

## Releasing

Do **not** bump `package.json` or create `v*` tags by hand.

1. Merge normal PRs to `master`.
2. [release-please](https://github.com/googleapis/release-please) opens or updates a **Release PR** that bumps `package.json`, updates `CHANGELOG.md`, and prepares the GitHub Release.
3. Merge that Release PR. It creates the `vX.Y.Z` tag and the GitHub Release.
4. [`.github/workflows/release.yml`](.github/workflows/release.yml) runs on the tag: tests, packages the VSIX, attaches it to the GitHub Release, and (when enabled) publishes to the VS Code Marketplace and Open VSX.

The first published version must be `0.0.1`. If the Release PR proposes something else, add a commit footer `Release-As: 0.0.1` (or squash with that footer) before merging.

Store-specific one-time setup (publisher accounts, GitHub environments/variables, Open VSX first-publish PAT) lives in a **private** maintainer file `PUBLISH-SETUP.local.md` at the repo root. It is gitignored on purpose — do not commit it.

## Reporting issues

Use the issue forms (bug, compatibility, feature). For compatibility problems, include the output of the **Asset Import Navigator** output channel with `"assetImportNavigator.debug": true`.

Report security issues privately; see [SECURITY.md](SECURITY.md).
