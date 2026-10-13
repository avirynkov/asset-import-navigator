# monorepo

Proves: the nearest `tsconfig.json` for the importing file is used, including `extends` and a cross-package alias (RES-02, nested configs).

Open `packages/web/src/App.tsx`:
- F12 on `CheckIcon` → `packages/ui/src/icons/check.svg` (via `@ui/*` in `packages/web/tsconfig.json`).
- F12 on `styles` → `packages/web/src/App.module.css`.
