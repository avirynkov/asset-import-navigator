# Phase 6 Findings: compatibility and conflict hardening

**Date:** 2026-10-13
**Gate:** AC-6.1–AC-6.10
**Environment:** macOS 26.6.2 (arm64), Node 22.23.1. E2E ran on VS Code 1.141.0 (stable, via `@vscode/test-cli`) with its bundled TypeScript 6.0.3. The repo/workspace TypeScript is 5.9.3.

## Defects found and fixed (bug fixes only, no features)

| # | Defect | Fix | Evidence |
|---|---|---|---|
| D1 | `typescript` was a devDependency but is `require`d at runtime by the parser, the tsconfig resolver and the extension core. A packaged VSIX would fail to load in both the extension host and tsserver. | Moved to `dependencies`. | Phase 7 VSIX audit |
| D2 | The plugin inspected tsserver's `SourceFile`s with the extension's own `typescript` copy. This is latent, not a live bug: `SyntaxKind` values are identical in 5.9.3 and 6.0.3 (measured). Fixing D1 alone would have loaded a second TS into every tsserver. | `src/shared/typescriptRuntime.ts`; the plugin's existing `attachTypeScript` hook now injects tsserver's module. Exported signatures are unchanged. | `typescriptRuntime.test.ts`; `probe:tsserver` passes; E2E Mode A passes |
| D3 | Cached alias/tsconfig resolutions were returned without re-checking the file, so a deleted or renamed asset kept producing links and definitions (RES-06, PERF-02). The cache also grew by one entry per document version. | Cache hits are re-validated with `fileExists`; entries for older versions of the same importer are pruned on insert. No file watchers were added: tsconfig is already re-read on each call and the hover re-stats. | `cacheRevalidation.test.ts` (fails on the old code, passes now) |
| D4 | Three lint errors surfaced by the new lint gate: an unused import in the probe script, a `let` that should be `const` in `pathUtils`, and an unused type import. | Fixed. | `npm run lint` clean |

## Acceptance checklist

| ID | Result | Evidence |
|---|---|---|
| AC-6.1 | **pass** | E2E `NINT-01` (real VS Code); `compatibility/nonInterference.test.ts`: 10 must-not-break positions × Mode A interceptor + Mode B core (package import/specifier/call, local import/specifier, legit `.d.ts` global, arbitrary string, `fetch` URL, `styles.foo`, `styles` usage); existing `tsserver-plugin/nonInterference.test.ts` (≥20 positions) |
| AC-6.2 | **pass (automated)**; modifier-key UI is **pending operator** | E2E: NAV-01/02/04/05/07/09 in VS Code 1.141.0; NAV-03 (alias) and NAV-06 (side-effect) are covered by Vitest. Cmd/Ctrl+Click and F12 UI: [MANUAL-CHECKLIST](../src/test/e2e/MANUAL-CHECKLIST.md) #1–#4 |
| AC-6.3 | **pass (documented)** | native/tsgo does not load contributed plugins (Phase 0 measurement on `typescriptteam.native-preview` 0.20261011.1), so Mode A is unavailable there and Mode B applies. [mode-b-limitations-draft](./mode-b-limitations-draft.md) is to be folded into the README (Phase 7). Not re-measured in this phase. |
| AC-6.4 | **pass** | `compatibility/performance.test.ts`, median of 50 runs on the `aliases` fixture: cached navigation **0.20 ms** (target < 20), uncached alias resolution **0.17 ms** (< 75), cached hover target **0.15 ms** (< 30). These figures cover parse + resolve on the local disk; VS Code IPC and markdown rendering are not included. |
| AC-6.5 | **pass** | Audit: no `readDirectory` / `readdir` / `findFiles` / glob in non-test `src/`. Resolution only stats the computed candidate paths. No watchers were added. |
| AC-6.6 | **pending operator** | Requires installing a CSS Modules extension: MANUAL-CHECKLIST #7. Automated part: `styles.foo` and `styles` usage are never claimed by either mode (nonInterference test). |
| AC-6.7 | **pass** | E2E `multi-root` (`multi-root-like/multi-root.code-workspace`): root-a → `a.svg`, root-b → `b.svg`, no sibling-root leakage; plus Vitest `negatives.test.ts`. |
| AC-6.8 | **partial** | Run locally on macOS (arm64). Windows and Linux will run in the Phase 7 CI matrix; until then, the gap is stated here and will be in the release notes. |
| AC-6.9 | **marked unsupported (untested)** | Remote SSH / WSL / Codespaces were not available in this session. The README will state "not tested for v1". MANUAL-CHECKLIST #11 is available for an operator. |
| AC-6.10 | **pass** | No new settings, asset kinds or features. Changes are bug fixes (D1–D4), tests, fixtures and test tooling. |

## Compatibility matrix

| Environment | Mode | Result | How |
|---|---|---|---|
| Bundled TS 6.0.3 (VS Code 1.141.0) | A | **pass** | E2E: `Icon` → `icon.svg` only, no `client.d.ts` (plugin rewrite confirmed) |
| Workspace TS 5.9.3 | A | **pass** | `npm run probe:tsserver` (classic tsserver + `--globalPlugins`); UI check is MANUAL-CHECKLIST #10 |
| native/tsgo | B | documented (Phase 0) | Plugins are not loaded; document links + fallback definition only |
| Single-root | A | pass | E2E `vite-svg-react` |
| Multi-root | A | pass | E2E `multi-root` |
| Nested tsconfig / `extends` | — | pass | Vitest `resolver.test.ts` (`nested-tsconfig`) |
| macOS arm64 | — | pass | local |
| Windows / Linux | — | pending (Phase 7 CI matrix) | — |
| Remote SSH / WSL / Codespaces | — | not tested → unsupported for v1 | — |

## Duplicate definitions in Mode A (Phase 4/5 follow-up)

Measured in E2E: `vscode.executeDefinitionProvider` on `Icon` returns **exactly one** result (`icon.svg ×1`). The plugin and the fallback provider return identical ranges (file start), so VS Code returns a single location. **No fix needed.** Whether peek shows one entry is MANUAL-CHECKLIST #3.

## Manual (pending operator)

MANUAL-CHECKLIST #1–#12. Results are not recorded in this session.

## Verification

```bash
npm run lint && npm run typecheck
npm test                 # Vitest: 162 tests (unit + core integration + compatibility)
npm run probe:tsserver   # ac01Pass: true, helperStillLocal: true
npm run test:e2e         # VS Code 1.141.0: vite-svg-react 8 passing, multi-root 2 passing
```

## Observations (not acted on)

- `npm audit` reports advisories in the dev dependency tree. It has not been triaged; Dependabot will be added in Phase 7.
- Hover and document links remain scoped as in Phase 5 (JS/JSX hover only; links and definition for TS/TSX). This is unchanged and intentional.
