# Phase 3 Findings — TypeScript Server Navigation (Mode A)

**Gate:** AC-3.* (Mode A definition rewrite under classic tsserver)

## Overrides (AC-3.6)

Exactly as measured in [phase-0-findings.md](./phase-0-findings.md):

1. `getDefinitionAndBoundSpan`
2. `getDefinitionAtPosition`

`getTypeDefinitionAtPosition` is **not** overridden.

## Acceptance checklist

| ID | Result | Notes |
|---|---|---|
| AC-3.1 | **pass** | SVG `?react` + plain SVG identifier → physical `.svg` (unit: `definitionInterceptor.test.ts`) |
| AC-3.2 | **pass** | CSS/SCSS module imports → physical stylesheets |
| AC-3.3 | **pass** | ≥20 NINT positions in `nint-suite` + helper/localValue on App.tsx |
| AC-3.4 | **pass** | Missing asset → no rewrite (delegate / RES-06) |
| AC-3.5 | **pass** | No global `.d.ts` filtering (rewrite only on successful resolve) |
| AC-3.6 | **pass** | Override set asserted = Phase 0 pair |
| AC-3.7 | **pass** (documented) | See COMPAT below |

## COMPAT

| ID | Result | Notes |
|---|---|---|
| COMPAT-01 (bundled TS) | **documented** | Phase 0 classic probe + contribution unchanged (`enableForWorkspaceTypeScriptVersions: true`). Unit LS tests exercise rewrite shape. Manual EDH: F12 / Cmd+Click on `src/test/fixtures/vite-svg-react` under classic tsserver. |
| COMPAT-02 (workspace TS) | **documented** | Same contribution flag; Phase 0 recorded workspace 5.9.3 plugin load = yes. Re-verify in EDH with workspace `typescript.tsdk` if needed. |
| COMPAT-03 (native/tsgo) | **Mode A unavailable** | Per Phase 0: plugins do not load under native/tsgo. **Do not claim Mode A** there. Mode B is later. |

## NAV-08 (manual)

Unit tests prove definition rewrite shape. F12 / Cmd+Click (NAV-08) requires Extension Development Host on classic tsserver:

1. `npm run compile`
2. Launch EDH against `vite-svg-react` or `phase0` fixture
3. F12 on `Icon` / `styles` / `scss` → physical asset, not `client.d.ts`

## Architecture notes

- Shared `resolveAssetSync` (+ sync tsconfig internals) for sync LS APIs; B.8 types unchanged.
- Config: `contributes.configuration` + extension `configurePlugin` + plugin `onConfigurationChanged`.
- Spike (`definitionSpike.ts`) removed; production interceptor uses `findAssetReferenceAt` + `resolveAssetSync`.

## Post-review fixes

- `readFile` miss / throw is absorbed by text loaders + `resolveAssetSync` + plugin try/catch (definition APIs never throw).
- Resolution cache stores **positive hits only**; tsconfig `contentId` refresh clears stale resolutions when config changes.

## Verification (this gate)

```bash
npm run typecheck
npm test -- src/test/unit/tsserver-plugin
npm test -- src/test/unit/resolution
npm run test:integration -- -t definition
```

**AC-3.1 … AC-3.7:** satisfied for Phase 3 scope (Mode A classic tsserver).
