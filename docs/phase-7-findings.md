# Phase 7 Findings: documentation, examples, ops, release candidate

**Date:** 2026-10-13
**Gate:** AC-7.1–AC-7.10
**Environment:** macOS 26.6.2 (arm64), Node 22.23.1, VS Code 1.141.0 (bundled TS 6.0.3), @vscode/vsce 4.0.0

## Acceptance checklist

| ID | Result | Evidence |
|---|---|---|
| AC-7.1 | **pass** | `README.md` follows the C.15 section order: problem, what it does, example, supported imports, navigation, hover, aliases/queries, configuration, Mode A/B compatibility, known limitations, troubleshooting, development, security, license. Its claims were checked against the code; the sanitizer list and the JS/JSX navigation scope were corrected during review. |
| AC-7.2 | **pass** | `examples/` has 8 projects plus a `README.md` matrix. Every example type-checks (`tsc -p`) and is validated by `src/test/integration/examples.test.ts` (21 checks). |
| AC-7.3 | **pass (defined, locally verified)** | `.github/workflows/ci.yml` has three jobs: quality (lint, typecheck, Vitest incl. examples/compat, tsserver probe), e2e (macOS/Windows/Linux, xvfb on Linux), and package (vsce, `verify-vsix.mjs`, `vsix-install-smoke.mjs`, artifact). Every step was run locally on macOS. **The first GitHub run is pending** because the repo isn't pushed; `actionlint` was unavailable, so the YAML was only parse-checked. |
| AC-7.4 | **pass** | Issue forms `bug.yml`, `compatibility.yml`, `feature.yml`; `config.yml` sets `blank_issues_enabled: false` and adds a security contact link. |
| AC-7.5 | **pass** | `release.yml` triggers on `push: tags v*` and `workflow_dispatch` only. The Marketplace job is gated by `vars.PUBLISH_TO_MARKETPLACE == 'true'` and uses Azure OIDC (`id-token: write`, `azure/login@v3`, `vsce publish --azure-credential`); no PAT secrets. A tag must match the `package.json` version. |
| AC-7.6 | **pass (automated)**; clean-profile UI is **pending operator** | `scripts/vsix-install-smoke.mjs` installs the VSIX into a fresh extensions/user-data dir with the VS Code 1.141.0 CLI, confirms `avirynkov.asset-import-navigator` is listed, and loads the tsserver plugin and extension core from the installed copy. The UI walkthrough is still manual. |
| AC-7.7 | **pass (automated)**; UI is **pending operator** | E2E: `./icon.svg?react` and `.module.scss` navigation + hover in VS Code. `@/…svg?react` via tsconfig: Vitest (`resolver.test.ts`, `examples/tsconfig-alias`) and E2E multi-root (`@/a.svg`). Cmd+Click UI: MANUAL-CHECKLIST #1–#5. |
| AC-7.8 | **pending operator** | MANUAL-CHECKLIST #8 (disable the extension → F12 lands in `client.d.ts`). |
| AC-7.9 | **pass** | `displayName` "Asset Import Navigator", `name` `asset-import-navigator`, publisher set by the human to `avirynkov` (valid vsce id). The publisher still has to be created on the Marketplace before publishing. |
| AC-7.10 | **pass** | `verify-vsix.mjs` passes: 73 entries, 3.74 MB. Required: extension entry, plugin entry, plugin manifest in `node_modules`, `typescript`. None of: `src/`, docs, examples, compiled tests, fixtures, `.env`, maps, logs. |

## Packaging facts (measured)

- The symlinked `file:` plugin dependency **is** packaged correctly by vsce: `extension/node_modules/asset-import-navigator-ts-plugin/package.json` is present and `main` resolves to `<ext>/out/tsserver-plugin/index.js`. The planned `ts-plugin/` fallback was not needed.
- The VSIX is 3.74 MB (mostly `typescript`), under the 10 MB threshold, so no slimming was applied.
- `vsce package --out dist/` requires the directory to exist. The workflows create it; this was found in the local dry run.

## Pre-publish hardening (2026-10-13)

| Item | Result |
|---|---|
| Minimum VS Code `^1.85.0` | **Verified**: the `vite-svg-react` E2E suite passes 8/8 on VS Code **1.85.0** (bundled TS 5.3). This was a one-off run: VS Code 1.85's Node 18 extension host can't load mocha 12 (ESM), so it ran with an isolated mocha 11. It is not in CI. |
| `capabilities.untrustedWorkspaces` | `supported: "limited"` with `restrictedConfigurations: ["assetImportNavigator.aliases"]` (code review fix): everything works in Restricted Mode except that workspace-level aliases are ignored, so an untrusted repo can't point resolution or hover reads outside itself. Without the declaration VS Code would disable the extension. Behaviour in Restricted Mode is MANUAL-CHECKLIST #13 (not yet observed). |
| `capabilities.virtualWorkspaces` | `supported: false` with a description: providers handle `file:` only, and the default (`true`) would over-claim. |
| Version / preview | `0.1.0` with `"preview": true`; CHANGELOG section `[0.1.0] - Unreleased`. |
| Icon / banner | `images/icon.png`, 256×256 with transparent corners, rendered from `images/icon.svg` (draft; replace it if you prefer your own). `galleryBanner` is dark `#2b2f77`. The SVG source is excluded from the VSIX. |
| Open VSX | `release.yml` job `openvsx`: `ovsx@1.2.0 publish --trusted-publishing` (OIDC, no token), gated by `vars.PUBLISH_TO_OPENVSX == 'true'`. |
| `qna` | Left at the Marketplace default (Q&A tab). |

## Deviations from the approved plan

- **Action versions:** the plan said `@v4`; current majors were looked up on 2026-10-13 and used instead (checkout@v7, setup-node@v7, upload-artifact@v7, download-artifact@v8, codeql-action@v4, release-drafter@v7, azure/login@v3).
- **Install smoke:** the plan's "`code --install-extension` in CI" is implemented as `scripts/vsix-install-smoke.mjs`, which downloads VS Code with `@vscode/test-electron` so it works on runners without VS Code installed.
- **CHANGELOG:** uses `[Unreleased]` rather than `0.1.0`; the version number is decided at release time (`package.json` is still `0.0.1`).

## Human actions before the first release

1. Create the GitHub repo `avirynkov/asset-import-navigator`, push, and confirm the first CI run is green on all three OSes.
2. Enable **Settings → Advanced Security → Private vulnerability reporting** (SECURITY.md links to it).
3. Create the labels in `.github/labels.md`.
4. Create the Marketplace publisher `avirynkov`. For automated publishing, configure Azure workload identity federation, set the repo variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and `PUBLISH_TO_MARKETPLACE=true`, and optionally add protection rules to the `marketplace` environment.
5. Run MANUAL-CHECKLIST #1–#13 on the packaged VSIX in a clean profile, and record the C.14 Definition of Done walkthrough.
6. **Open VSX** (for Cursor/VSCodium users): sign in at open-vsx.org with GitHub, sign the publisher agreement, create the `avirynkov` namespace, register this repository's `release.yml` as a trusted publisher, then set the repository variable `PUBLISH_TO_OPENVSX=true`.
7. Optionally record a demo GIF for the README (no proprietary code).
8. Replace "Unreleased" in the CHANGELOG `[0.1.0]` heading with the date and tag `v0.1.0` (the tag must match `package.json`).

## Verification

```bash
npm ci
npm run lint && npm run typecheck
npm test                      # 183 tests / 30 files
npm run compile && npm run probe:tsserver
npm run test:e2e              # 8 + 2 passing on VS Code 1.141.0
mkdir -p dist && npx vsce package --out dist/
node scripts/verify-vsix.mjs dist/*.vsix
node scripts/vsix-install-smoke.mjs dist/*.vsix
```
