# Phase 2 Findings — Physical Asset Resolver

**Gate:** AC-2.* (physical resolution + interface freeze)

## Host surface (B.8)

- **No B.8 extensions.** `AssetResolverHost` remains:
  - `fileExists(uri: string): boolean | Promise<boolean>`
  - `readFile?(uri: string): Uint8Array | Promise<Uint8Array>`
- Nearest `tsconfig.json` / `jsconfig.json` discovery walks parents via constructed paths + `fileExists` only (no `directoryExists` / `readdir`).

## Adapter contract

- Adapters **must** implement `readFile` for tsconfig/jsconfig resolution (AC-2.1, AC-2.6).
- If `readFile` is missing, the tsconfig/jsconfig stage is skipped and resolution falls through to configured aliases only.
- Relative resolution needs only `fileExists`.

## Path / URI semantics (frozen)

- `ResolvedAsset.physicalUri` and host `uri` arguments are **absolute filesystem paths**, `/`-normalized.
- Not `file://` URIs. Adapters convert to `vscode.Uri` / TypeScript fileNames later.

## Configured aliases

- Shared API accepts **absolute** path-prefix values (`Record<string, string>`).
- Callers (extension / plugin adapters) must absolutize `assetImportNavigator.aliases` before calling `resolveAsset`.
- Matching: longest-prefix key among alias map entries.

## `extends` limits

- Supported: relative or absolute **file** `extends`, including TypeScript 5+ **array** of such.
- **Out of Phase 2:** package-name `extends` (e.g. `@tsconfig/strictest`) — would need node_modules resolution / extra host APIs.

## Resolution order (B.5)

1. Relative (`./` / `../`) — missing file → `undefined` (no fall-through)
2. Nearest tsconfig/jsconfig `baseUrl` + `paths` (TS path-match algorithm; multi-target first existing; `baseUrl` fallback)
3. Configured aliases

## Freeze surface (AC-2.7)

After Phase 2 acceptance, treat as frozen:

- B.8: `AssetKind`, `AssetReference`, `ResolvedAsset`, `AssetResolverHost`
- Phase 2 exports: `resolveAsset`, `ResolveAssetOptions`, resolution cache types/helpers, and the relative / tsconfig / configured-alias resolvers’ public signatures

Do not silent-rename B.8 fields. Escalate contract changes.

## Verification (this gate)

```bash
npm test -- src/test/unit/resolution   # 31 passed
npm run typecheck
# rg guards: no vite.config / vscode under src/shared
```

**AC-2.1 … AC-2.7:** satisfied. Shared public interfaces are **frozen** as of this findings doc.
