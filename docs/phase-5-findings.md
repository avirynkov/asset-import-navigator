# Phase 5 Findings — Asset hover and SVG preview

**Gate:** AC-5.1–AC-5.6 (HOV-01…05, NINT-01)

## Acceptance checklist

| ID | Result | Notes |
|---|---|---|
| AC-5.1 | **pass** (unit/integration) | Safe SVG → markdown-image `data:image/svg+xml` via `svgPreviewRenderer` |
| AC-5.2 | **pass** (unit/integration) | Hover markdown includes workspace-relative / fixture path to physical `.svg` |
| AC-5.3 | **pass** (unit/integration) | SCSS/CSS hover → physical `Card.module.scss` / type module|plain; not `client.d.ts` |
| AC-5.4 | **pass** (unit) | Oversized / malformed / scripted / remote-href / handlers / ENTITY-DOCTYPE → metadata-only |
| AC-5.5 | **pass** (integration) | `helper` / `localValue` → `resolveAssetHoverAt` undefined |
| AC-5.6 | **pass** (integration) | Shared host + resolution cache: definition target unchanged after simulated preview throw; preview cache clear does not affect nav |

## Locked approach

| Topic | Choice |
|---|---|
| SVG hover | **markdown-image** (Phase 0) |
| Safety | `MarkdownString.isTrusted = false`; detect-and-reject (no strip-and-embed) |
| Size gate | Stat-first in `hoverProvider`; over `hover.maxPreviewBytes` → metadata-only, no body read |
| Open file | `[Open file](file-uri)` markdown link (EDH confirm required) |
| Languages | Hover: TS/TSX/JS/JSX; DocumentLink + Definition: TS/TSX only |

## Architecture notes

- Preview modules under `src/preview/**` are vscode-free.
- Resolve via `resolveAssetHoverAt` → frozen `resolveAsset`; touching range for Hover highlight.
- B.9: `hover.enabled`, `hover.svgPreview`, `hover.maxPreviewBytes` (default 524288).
- Plugin `configurePlugin` payload unchanged (no hover keys).
- Phase 0 spike (`phase0Hover.ts` / hardcoded `./icon.svg?react`) removed.

## Known asymmetries / follow-ups (not Phase 5)

- JS/JSX hover without DocumentLink/Definition on JS (intentional).
- No full asset file-watch; preview revalidates via stat mtime/size token.
- Phase 2 relative-path cache asymmetry; empty alias key validation.
- Mode A + always-on fallback DefinitionProvider possible duplicate defs.

## Manual EDH (operator checklist)

1. Hover `Icon` / `./icon.svg?react` in `vite-svg-react` → thumbnail + path + Open file.
2. Hover SCSS import → physical module file metadata.
3. Hover `helper` → no asset hover (TS hover only).
4. Confirm Open file under `isTrusted=false`; if not clickable → escalate before trusting markdown.
5. After hovering a scripted/unsafe SVG (or fixture), F12 / document link still open physical assets.

**EDH status (this gate):** **pending operator** — automated AC-5.* green; Open-file clickability not recorded in this session.

## Verification

```bash
npm run typecheck
npm test -- src/test/unit/preview
npm run test:integration -- -t hover
npm test
```

**AC-5.1 … AC-5.6:** satisfied under Vitest (EDH Open-file pending).
