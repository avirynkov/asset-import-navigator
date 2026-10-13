# Phase 4 Findings — Extension-host navigation fallback (Mode B)

**Gate:** AC-4.* (document links + narrow fallback DefinitionProvider + mode debug + Mode B limitation draft)

## Acceptance checklist

| ID | Result | Notes |
|---|---|---|
| AC-4.1 | **pass** (unit/integration + EDH) | Document links for relative SVG/CSS/SCSS (`vite-svg-react`), side-effect NAV-06, tsconfig paths (`aliases` fixture). EDH click confirmed. |
| AC-4.2 | **pass** (unit/integration) | Fallback definition → physical path on specifier + binding (`resolveAssetDefinitionAt`). |
| AC-4.3 | **pass** (unit/integration) | Non-asset positions (`helper`, `localValue`, nint-suite) → `undefined` (NINT-01). |
| AC-4.4 | **pass** (code + unit) | `detectNavigationMode` + OutputChannel when `assetImportNavigator.debug`; no source contents logged. EDH: confirm channel text. |
| AC-4.5 | **pass** | [mode-b-limitations-draft.md](./mode-b-limitations-draft.md) written for Phase 7 README (NAV-10). |
| AC-4.6 | **pass** | Draft explicitly refuses Mode B definition-preview parity with Mode A. |
| Mode A regression | **pass** | `src/test/unit/tsserver-plugin` still green; override set untouched. |

## COMPAT

| ID | Result | Notes |
|---|---|---|
| COMPAT-03 (native/tsgo) | **Mode A unavailable** (unchanged) | Mode B providers always registered when `enabled`. Debug reports Mode B when `js/ts.experimental.useTsgo` is true (`useTsgo` checked **before** configurePlugin). |

## Architecture notes

- Extension host uses async `resolveAsset` + `createVscodeFileSystem` (`fileExists` + `readFile` → `Uint8Array`).
- Pure helpers in `assetNavigationCore.ts` (no vscode) drive Vitest; thin DocumentLink / Definition wrappers call them.
- `physicalUri` remains absolute `/`-normalized FS paths until `vscode.Uri.file` in adapters/providers.
- Aliases absolutized via existing `absolutizeAliases` against the document workspace folder.
- Mode detection is **observational** (`Mode A expected` ≠ plugin-loaded proof).
- Positive-only resolution cache inherited from Phase 3; config change clears via `invalidateOnExtensionConfigChange`. No full asset file-watch in Phase 4.

## Manual EDH (operator checklist)

Record results when running Extension Development Host:

1. Classic tsserver: document link on `./icon.svg?react` opens `icon.svg`; F12 still physical (Mode A). Note if extension DefinitionProvider duplicates the physical target.
2. Mode B / native-tsgo if available: document link opens physical file; F12 may show multiple results (asset + `.d.ts`) — expected (NAV-10).
3. If native/tsgo unavailable in this environment: write **unavailable** here — do not invent results.
4. `assetImportNavigator.debug: true` → OutputChannel **Asset Import Navigator** shows mode line; no file bodies.

**EDH status (this gate):** **pass** — operator confirmed 2026-10-12 on `vite-svg-react` Extension Development Host (document links + navigation work). Native/tsgo aggregation not separately recorded in this session (treat as optional follow-up if needed before Phase 7 README COMPAT-03 detail).

## Verification (this gate)

```bash
npm run typecheck
npm test -- src/test/unit/tsserver-plugin
npm test -- src/test/unit/resolution
npm test -- src/test/unit/platform src/test/unit/extension
npm run test:integration -- -t "documentLink|fallback"
```

**AC-4.1 … AC-4.6:** satisfied (automated + operator EDH confirmation on classic path).
