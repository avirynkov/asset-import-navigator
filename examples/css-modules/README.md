# css-modules

Proves: a `.module.css` import opens the stylesheet (NAV-04, HOV-03), while `styles.card` is left to CSS Modules tools (NINT-05).

Open `src/Card.ts`:
- F12 on `styles` (in the import) → `src/Card.module.css`.
- F12 on `styles.card` → **not** handled by this extension (use a CSS Modules extension).
