# Manual E2E checklist

These checks cover modifier-key UI and environments that `vscode-test` cannot reach. Record each result
(pass / fail / unavailable, VS Code version, OS, date) in the current phase findings doc. Never record a
result you did not observe.

Launch: **Run and Debug → "Extension Development Host (vite-svg-react)"**, or install the packaged VSIX into a clean
profile (`code --profile clean --install-extension asset-import-navigator-*.vsix`).

| # | Check | Expected | AC |
|---|---|---|---|
| 1 | Cmd/Ctrl+Click `Icon` in `App.tsx` | Opens `icon.svg` | NAV-08 |
| 2 | Cmd/Ctrl+hover `Icon` (definition preview) | Preview shows `icon.svg`, not `client.d.ts` | NAV-09 |
| 3 | Peek Definition (Alt+F12) on `Icon` | A single `icon.svg` entry, with no duplicate | NAV-07/09 |
| 4 | F12 on `styles` / `scss` imports | Opens `Card.module.css` / `Card.module.scss` | NAV-04/05 |
| 5 | Hover `Icon`, then click **Open file** | Thumbnail, path and size are shown; Open file opens the SVG (`isTrusted=false`) | HOV-01/02 |
| 6 | Hover `helper` | Only the normal TypeScript hover; no asset hover | NINT-01 |
| 7 | Install a CSS Modules extension (e.g. `clinyong.vscode-css-modules`), then F12 on `styles.foo` and on the `styles` import | `styles.foo` goes to the selector (owned by that extension); the import still opens the stylesheet | NINT-05 |
| 8 | Disable Asset Import Navigator, then reload | F12 on `Icon` lands in `client.d.ts` again (baseline restored) | NINT-06 |
| 9 | Native TS / tsgo (`js/ts.experimental.useTsgo: true`) | Document links open the asset (Mode B); F12 may also list `client.d.ts` (documented) | COMPAT-03, NAV-10 |
| 10 | Workspace TypeScript (`typescript.tsdk` → `node_modules/typescript/lib`, "Use Workspace Version") | Same as #1–#2 | COMPAT-02 |
| 11 | Remote SSH / WSL / Codespaces (if available) | Same as #1, #5 | COMPAT-06 |
| 12 | Delete `logo.svg` while `App.tsx` is open, then hover or Ctrl+Click `./logo.svg` | No link and no definition to the missing file | RES-06, PERF-02 |
