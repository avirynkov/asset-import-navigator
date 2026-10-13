# Phase 0 Findings — Asset Import Navigator

**Date:** 2026-10-11  
**Hard gate AC-0.1:** **pass**

## Decision table

| Decision | Allowed values | Chosen |
|---|---|---|
| Definition methods to override | Measured list (e.g. getDefinitionAndBoundSpan, …) | `getDefinitionAndBoundSpan`, `getDefinitionAtPosition` |
| Classic tsserver intercept works? | yes / no | **yes** |
| Native/tsgo plugin loads? | yes / no / partial | **no** |
| SVG hover approach | markdown-image / raster-data-uri / metadata-only | **markdown-image** |
| Minimum engines.vscode | semver | `^1.85.0` (scaffold floor; tested on 1.141.0) |
| Exact VS Code version tested | string | VS Code `1.141.0` (also Cursor `3.24.12` host available) |
| Exact TypeScript versions tested | strings | Bundled (VS Code/Cursor): `6.0.3`; classic tsserver probe / workspace fixture: `5.9.3` |

## Acceptance checklist

| ID | Result | Notes |
|---|---|---|
| AC-0.1 | **pass** | Classic tsserver + plugin: `definitionAndBoundSpan` / `definition` primary file = `icon.svg` |
| AC-0.2 | **pass** | Ambient `client.d.ts` is not primary after rewrite |
| AC-0.3 | **pass** | `helper` still resolves to `sample.tsx` |
| AC-0.4 | **pass** | Workspace TS 5.9.3: plugin loaded = yes; F12-equivalent rewrite = yes |
| AC-0.5 | **pass** (recorded) | Native Preview / TypeScript 7 does **not** load contributed plugins |
| AC-0.6 | **pass** | Chose `markdown-image` (SVG as `data:image/svg+xml` in Markdown) |
| AC-0.7 | **pass** | This document |
| AC-0.8 | **pass** | Vitest: `phase0-proxy`, `phase0-ls-intercept`, `phase0-hover` |
| AC-0.9 | **pass** | `enableForWorkspaceTypeScriptVersions: true` in root `package.json` |

## Experiment notes

### Baseline ambient F12 (problem reproduced)

- Without plugin, classic tsserver `definitionAndBoundSpan` on `Icon` in `import Icon from './icon.svg?react'` returns primary file `…/client.d.ts`.
- Evidence: `src/test/unit/phase0-ls-intercept.test.ts` + baseline tsserver probe (`landsOnAmbient: true`).
- Fixture also includes `*.module.scss` ambient + import for baseline problem reproduction only (not a Phase 0 intercept AC).

### Bundled TS (COMPAT-01 / AC-0.1)

- VS Code app bundled TypeScript: **6.0.3**.
- Classic tsserver protocol probe (same mechanism VS Code uses for contributed `typescriptServerPlugins` via `--globalPlugins` + `--pluginProbeLocations`):
  - Log: `Loading global plugin asset-import-navigator-ts-plugin`
  - Log: `[asset-import-navigator-ts-plugin] create() — plugin loaded`
  - Primary definition: `…/icon.svg`
  - Commands exercised: `definitionAndBoundSpan`, `definition` (maps to LS `getDefinitionAndBoundSpan` / `getDefinitionAtPosition`)
- Reproduce: `npm run compile && npm run probe:tsserver`
- Manual UI (optional confirm): F5 → “Extension Development Host (Phase 0 fixture)” → F12 on `Icon`.

### Workspace TS (COMPAT-02)

- `typescript.tsdk` fixture path: `src/test/fixtures/phase0/node_modules/typescript/lib`
- Workspace TypeScript version: **5.9.3**
- Plugin loaded: **yes** (`create()` in tsserver log)
- Definition rewrite: **yes** (primary = `icon.svg`)
- `enableForWorkspaceTypeScriptVersions: true` is present and required for this path.

### Native/tsgo (COMPAT-03)

- Extension installed: `typescriptteam.native-preview` version **0.20261011.1** (display name “TypeScript 7”), on Cursor extensions dir.
- Setting: `js/ts.experimental.useTsgo: true` (per extension README).
- **Plugin loads? no** — measured from extension implementation (not guessed):
  - Bundle warns: *“TypeScript server plugins from the "{0}" extension will not be loaded because TypeScript 7 is enabled globally.”*
  - Collects `contributes.typescriptServerPlugins` only to warn; no `globalPlugins` / `pluginProbe` loading path found.
- Implication: Mode A unavailable under native/tsgo; Mode B (later phases) required for that path. Do **not** claim Mode A parity there.

### Definition API call log (measured)

Observed under classic tsserver for Go to Definition-style requests on the SVG import:

1. `getDefinitionAndBoundSpan` — **hit** (rewrite applied)
2. `getDefinitionAtPosition` — **hit** (rewrite applied)
3. `getTypeDefinitionAtPosition` — wrapped for logging in spike; **not observed** on these requests → **do not require** override for Phase 3 unless a later measure shows VS Code calling it for asset imports

Phase 3 must override **exactly**: `getDefinitionAndBoundSpan`, `getDefinitionAtPosition`.

### SVG hover trials and Chosen rationale

| Approach | Result |
|---|---|
| markdown-image | **Chosen.** Embed sanitized local SVG via `![…](data:image/svg+xml,…)` in `MarkdownString`. No remote URLs. Scripted SVG fails closed to metadata. Unit coverage in `phase0-hover.test.ts`. |
| raster-data-uri | Not implemented (no rasterizer in Phase 0). Would only be needed if markdown image preview is rejected visually in EDH. |
| metadata-only | Fallback if preview unsafe/unavailable; still shows path + size. |

Safety: `isTrusted = false`; no remote fetch; `<script` in SVG → metadata-only.

### Hard gate AC-0.1

**pass** — classic tsserver plugin intercept replaces ambient definition with physical SVG as primary target.

## Verification commands

```bash
npm install
npm run compile
npm test
npm run probe:tsserver
node -e "console.log(require.resolve('asset-import-navigator-ts-plugin'))"
```

## Proceed to Phase 1?

**Yes** — AC-0.1 = true and this findings doc is complete (AC-0.7).
