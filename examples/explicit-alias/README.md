# explicit-alias

Proves: aliases that exist only in `vite.config.ts` work through the `assetImportNavigator.aliases` setting (RES-04, RES-07).

`.vscode/settings.json` maps `~assets` → `src/assets`. Open `src/main.ts` and press F12 on `star` → `src/assets/star.svg`.
