# Asset Import Navigator

**Navigate imported SVG, CSS, SCSS, CSS Modules, and other assets to their real source files, with useful hover previews instead of declaration-file dead ends.**

## The problem

In a Vite + TypeScript/React project, you import assets like this:

```ts
import Icon from '@/assets/icons/exceptional_trader.svg?react';
import styles from './Card.module.scss';
import './global.scss';
```

Vite understands these imports. VS Code doesn't: its JavaScript/TypeScript navigation comes from the TypeScript language service, which only knows the wildcard declarations in your `vite-env.d.ts` / `client.d.ts`:

```ts
declare module '*.svg?react' {
  const Component: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default Component;
}
```

So **Cmd/Ctrl+Click on `Icon` opens `client.d.ts`** instead of the SVG, and hover shows a generic type instead of the asset.

## What Asset Import Navigator does

- **Go to Definition** (F12, Cmd/Ctrl+Click, Peek) on a supported asset import opens the **physical file**: the `.svg`, `.css`, `.scss`, `.sass` or `.less` on disk.
- **Document links** on the import path (`'./icon.svg?react'`) open the same file.
- **Hover** shows the resolved file, its workspace-relative path, size and type, plus a **sanitized SVG thumbnail**.
- Everything else, including ordinary TypeScript navigation, package imports, real `.d.ts` symbols and `styles.foo`, is left untouched.

It works by adding a small TypeScript server plugin that replaces the definition result **only** for supported asset imports. Nothing is executed from your project: `vite.config.ts` is never run.

## Example

```ts
import Icon from '@/assets/icon.svg?react';   // F12 on Icon         → src/assets/icon.svg
import logo from './logo.svg?url';             // Cmd+Click the path  → logo.svg
import styles from './Card.module.scss';       // F12 on styles       → Card.module.scss
import './global.scss';                        // Cmd+Click the path  → global.scss

styles.container;                              // untouched: use a CSS Modules extension for selectors
```

Hovering `Icon` shows a thumbnail of `icon.svg`, `src/assets/icon.svg`, its size and viewBox, and an **Open file** link.

The [`examples/`](examples/README.md) folder has eight small projects you can open to try each case.

## Supported imports

| Syntax | Example |
|---|---|
| Default import | `import Icon from './icon.svg?react'` |
| Namespace import | `import * as icons from './icons.svg'` |
| Side-effect import | `import './global.scss'` |
| Default re-export | `export { default as Icon } from './icon.svg?react'` |
| Star re-export | `export * from './theme.css'` |

| Asset | Extensions |
|---|---|
| SVG | `.svg`, including `?react`, `?url`, `?raw` and other queries |
| Stylesheets | `.css`, `.scss`, `.sass`, `.less`, and the `*.module.*` variants |

The extension is deliberately conservative. It only reacts to static `import`/`export` declarations with a string-literal path. Named imports (`import { ReactComponent } from './x.svg'`), dynamic `import()`, `fetch('/a.svg')` and arbitrary strings are ignored. If an asset file doesn't exist, the extension returns nothing: it never points you at a fabricated target.

## Navigation behavior

| Action | Where | Result |
|---|---|---|
| F12 / Cmd+Click / Peek on the imported name (`Icon`, `styles`) | TS, TSX | Physical asset (Mode A) |
| F12 / Cmd+Click on the module path | TS, TSX | Physical asset (Mode A) |
| Cmd+Click a document link on the module path | TS, TSX | Physical asset (Mode A and Mode B) |
| Cmd/Ctrl+hover definition preview | TS, TSX | Preview of the physical asset (Mode A) |
| Hover | TS, TSX, JS, JSX | Asset details |

In JS/JSX files, the TypeScript server plugin is expected to apply as well, but this isn't covered by tests yet.

Text files open at line 1. See [Compatibility](#compatibility-mode-a-and-mode-b) for Mode A and Mode B.

## Hover behavior

- **SVG:** a thumbnail (when safe), file name, workspace-relative path, original import specifier, size, dimensions/viewBox, and an **Open file** link.
- **CSS / SCSS / Sass / Less:** file name, path, type (module or plain stylesheet), size, and **Open file**.

Hover only appears on supported asset imports; TypeScript's own hover is never suppressed.

**Preview safety.** The SVG is embedded as a local `data:` image inside an untrusted Markdown hover. Files that contain scripts, event handlers, remote references, `<!ENTITY>` declarations or an external `<!DOCTYPE>`, or that are larger than `hover.maxPreviewBytes`, are **not** previewed. You get metadata only. Nothing is ever fetched from the network.

## Alias and query support

Paths are resolved in this order:

1. **Relative paths**, against the importing file.
2. **`tsconfig.json` / `jsconfig.json` `baseUrl` + `paths`**, from the nearest config for the importing file. `extends`, wildcards (`@/*`) and multiple targets are supported.
3. **`assetImportNavigator.aliases`**, for aliases that only exist in your Vite config.

Vite aliases are **not** read from `vite.config.ts`, because that would mean executing project code. If an alias exists only there, either mirror it in `tsconfig.json` `paths` (recommended, since TypeScript then understands it too) or add it to the setting:

```jsonc
// .vscode/settings.json
{
  "assetImportNavigator.aliases": {
    "~assets": "src/assets"
  }
}
```

Keys are plain prefixes, and the longest match wins. Relative values are resolved against the workspace folder.

**Queries:** `?react`, `?url`, `?raw`, `?inline` and any other query, plus `#hash`, are stripped for supported extensions: `icon.svg?react` → `icon.svg`.

## Configuration

| Setting | Default | Description |
|---|---|---|
| `assetImportNavigator.enabled` | `true` | Turns definition rewrite, document links and fallback definition on or off. |
| `assetImportNavigator.extensions` | `[".svg", ".css", ".scss", ".sass", ".less"]` | Asset extensions eligible for navigation. |
| `assetImportNavigator.aliases` | `{}` | Extra path-prefix aliases (see above). |
| `assetImportNavigator.queryPolicy` | `"strip-for-supported-extension"` | How import queries are handled. This is currently the only policy. |
| `assetImportNavigator.hover.enabled` | `true` | Show asset hover content. |
| `assetImportNavigator.hover.svgPreview` | `true` | Embed a sanitized SVG thumbnail in the hover. |
| `assetImportNavigator.hover.maxPreviewBytes` | `524288` | Largest SVG (in bytes) that gets a thumbnail; larger files show metadata only. |
| `assetImportNavigator.debug` | `false` | Write mode and resolution diagnostics to the **Asset Import Navigator** output channel. File contents are never logged. |

It's zero-config when your imports are relative or your aliases are in `tsconfig.json`/`jsconfig.json`.

## Compatibility: Mode A and Mode B

| | **Mode A**: classic TypeScript server (the default) | **Mode B**: plugin unavailable (e.g. native TypeScript / tsgo) |
|---|---|---|
| When | VS Code's bundled TypeScript, or a workspace TypeScript version | `js/ts.experimental.useTsgo: true` (TypeScript 7 native preview), or the plugin failed to load |
| Go to Definition | **Only** the physical asset | The physical asset **plus** TypeScript's `.d.ts` result |
| Cmd/Ctrl+hover preview | Physical asset | Not guaranteed; usually the `.d.ts` |
| Document links on the path | ✓ | ✓ (the reliable path) |
| Hover | ✓ | ✓ |

In Mode A, the plugin rewrites the definition result *before* VS Code sees it. In Mode B, the native TypeScript preview doesn't load TypeScript server plugins, so the extension can only *add* its own result next to TypeScript's. VS Code then shows both in Peek. The extension does not hide TypeScript's results.

**Tested:**
- VS Code 1.141 with bundled TypeScript 6.0.3 (automated E2E)
- VS Code 1.85 with bundled TypeScript 5.3, the minimum supported version (same E2E suite, run once before release)
- workspace TypeScript 5.9 (tsserver probe)
- single- and multi-root workspaces
- nested `tsconfig` with `extends`
- macOS locally; the automated test suite also runs on Windows and Linux in CI

Remote SSH, WSL and Codespaces have **not been tested** for this version.

**Workspace Trust:** the extension runs in Restricted Mode because it never executes project code; it only parses `tsconfig`/`jsconfig` as JSON and checks whether files exist. In Restricted Mode, a workspace's own `assetImportNavigator.aliases` setting is ignored (your user-level setting still applies), so an untrusted folder can't point resolution or previews outside itself. **Virtual workspaces** (e.g. github.dev) are not supported, because resolution needs a real file system.

**Cursor, VSCodium and other VS Code–based editors** install extensions from [Open VSX](https://open-vsx.org); the extension is published there as well.

## Known limitations

- **Mode B can't replace TypeScript's result.** Peek can list both the asset and `client.d.ts`; use the document link on the import path.
- **`styles.someClass` is out of scope.** Selector navigation inside CSS Modules isn't handled; use a dedicated CSS Modules extension alongside this one.
- **Aliases defined only in `vite.config.ts` are not detected.** Add them to `tsconfig.json` `paths` or to `assetImportNavigator.aliases`.
- **Some import forms aren't handled yet:** named imports from assets, dynamic `import()`, and `require()`.
- **Images, fonts and other `?raw` text files aren't handled yet.**
- **Navigation is tested for TS/TSX only.** Document links and the fallback definition are registered for TS/TSX; JS/JSX navigation relies on the TypeScript server plugin and is untested.

## Troubleshooting: "it still opens client.d.ts"

1. **Check that the import is supported.** It must be a static import with a supported extension, and the file must exist at the resolved path. Try Cmd+Click on the path string: if the document link works, resolution is fine.
2. **Restart the TS server.** Run **TypeScript: Restart TS Server** from the command palette. The plugin loads when the TypeScript server starts.
3. **Check for native TypeScript (tsgo).** If `js/ts.experimental.useTsgo` is on, you are in Mode B (see above).
4. **If you use the workspace TypeScript version,** it is supported, but the TS server must be restarted after switching.
5. **Check your aliases.** Make sure the alias is in `tsconfig.json`/`jsconfig.json` `paths` (in the config that applies to the importing file) or in `assetImportNavigator.aliases`.
6. **Turn on debug output.** Set `"assetImportNavigator.debug": true` and open **Output → Asset Import Navigator**. It reports whether Mode A is expected and how specifiers resolved.

Still stuck? [Open a compatibility issue](https://github.com/avirynkov/asset-import-navigator/issues/new/choose) with your VS Code version, TypeScript mode and the debug output.

## Development and contributing

```bash
npm ci
npm run lint && npm run typecheck
npm test              # Vitest: unit, core integration, compatibility, examples
npm run test:e2e      # launches VS Code with the fixtures (Mode A, multi-root)
npm run package       # builds the .vsix
```

Press **F5** ("Extension Development Host (vite-svg-react)") to try it on a fixture. See [CONTRIBUTING.md](CONTRIBUTING.md) for the architecture and the testing rules.

## Security

SVG previews are the main security surface; see [SECURITY.md](SECURITY.md) for the threat model and for how to report a vulnerability privately.

## License

[MIT](LICENSE)
