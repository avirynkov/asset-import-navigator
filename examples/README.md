# Examples

Small projects that reproduce each supported scenario. Open one folder in VS Code with Asset Import Navigator installed, then follow its README. No `npm install` is needed to try navigation: each project ships its own Vite-style ambient declarations (`src/vite-env.d.ts`), which is exactly what normally sends Go to Definition to a declaration file.

All of them are checked automatically by `src/test/integration/examples.test.ts`.

| Example | Proves | Criteria |
|---|---|---|
| [vite-react-svg-react](vite-react-svg-react/) | `?react` SVG import and `export { default as X }` re-export → physical SVG; SVG hover | NAV-02, HOV-01, HOV-02 |
| [vite-react-svg-url](vite-react-svg-url/) | Plain, `?url` and `?raw` SVG imports → the same physical file | NAV-01, RES-05 |
| [css-modules](css-modules/) | `.module.css` import → stylesheet; `styles.card` left to CSS Modules tools | NAV-04, HOV-03, NINT-05 |
| [scss-modules](scss-modules/) | `.module.scss` import and side-effect `import './global.scss'` | NAV-05, NAV-06, NAV-07 |
| [tsconfig-alias](tsconfig-alias/) | `@/*` from `tsconfig.json` `paths`, zero configuration | NAV-03, RES-02, RES-03 |
| [explicit-alias](explicit-alias/) | Vite-only alias mirrored in `assetImportNavigator.aliases`; `vite.config.ts` never executed | RES-04, RES-07 |
| [mixed-assets](mixed-assets/) | Only asset imports are touched: local, package, `.d.ts`, strings and `fetch` stay with TypeScript | NINT-01 … NINT-04 |
| [monorepo](monorepo/) | Nearest `tsconfig.json` with `extends` and a cross-package alias | RES-02, nested configs |
