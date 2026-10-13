# Mode B limitations (draft for Phase 7 README)

> Seed copy for README / Marketplace docs (NAV-10, AC-4.5, AC-4.6). Not the shipping README.

## When Mode B applies

Mode B is the extension-host navigation path used when the TypeScript server plugin cannot load—notably under **native TypeScript / tsgo** (`js/ts.experimental.useTsgo`) where contributed `typescriptServerPlugins` are not loaded (COMPAT-03). Mode A definition rewrite is **unavailable** there. Do not claim Mode A behavior under native/tsgo.

## What still works

- **Document links** on supported asset module specifiers open the physical file when resolution succeeds. This is the **primary reliable** navigation path in Mode B (NAV-07).
- A **narrow fallback DefinitionProvider** may return the physical asset for supported asset positions only. It never claims ordinary TypeScript symbols (NINT-01).

## What to expect (honest limits)

- **Go to Definition / peek may show multiple results** in Mode B: the physical asset (from this extension) **and** TypeScript’s ambient `.d.ts` (or other built-in results). VS Code aggregates providers; this extension does **not** suppress the built-in TypeScript DefinitionProvider.
- **Modifier-key definition preview** is **not** claimed to match Mode A. Mode A rewrites the language-service definition result before VS Code receives it; Mode B cannot guarantee the same preview target. **Do not claim Mode B definition-preview parity with Mode A** (AC-4.6).
- Under **classic tsserver (Mode A expected)**, both the plugin rewrite and the extension fallback DefinitionProvider may contribute a physical-file location (possible duplicate). Document links remain useful in both modes.

## Debug

With `assetImportNavigator.debug` enabled, the **Asset Import Navigator** OutputChannel reports whether the environment looks like **Mode A expected** or **Mode B (…)**. It does not log source file contents.

## Non-goals (unchanged)

- No global filtering of `.d.ts` definitions
- No ownership of CSS Modules `styles.foo` selector navigation
- No execution of `vite.config.ts`
