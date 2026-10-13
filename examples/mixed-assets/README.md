# mixed-assets

Proves: strict scoping — only asset imports are touched (NINT-01…NINT-04).

Open `src/main.ts`:
- F12 on `logo` → `src/assets/logo.svg`; Cmd+Click `'./theme.css'` → `src/theme.css`.
- F12 on `formatLabel` → `src/utils.ts` (normal TypeScript).
- F12 on `Button` → `src/types.d.ts` (the legitimate declaration stays).
- The `'/assets/logo.svg'` strings are **not** links or definitions.
