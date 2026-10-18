# Agent guide — Asset Import Navigator

Project-only rules for this repository. For human contributors, [CONTRIBUTING.md](CONTRIBUTING.md) is canonical.

## Purpose

VS Code extension plus a TypeScript server plugin that navigates asset imports (SVG, CSS/SCSS/Sass/Less, including Vite query forms) to physical files with safe hover previews. See [README.md](README.md).

## Read first

1. [CONTRIBUTING.md](CONTRIBUTING.md) — layout, safety rules, tests, PR expectations
2. [SECURITY.md](SECURITY.md) — threat model and private vulnerability reporting
3. [README.md](README.md) — user-visible behavior, Mode A/B, configuration

## Layout

```text
src/
  tsserver-plugin/   Mode A: tsserver plugin — rewrite definition results for asset imports
  extension/         Extension host: hover, document links, fallback definition, config, debug
  shared/            Environment-neutral core: AST detection, parsing, resolution, classification
  preview/           SVG/stylesheet metadata, SVG sanitizer, hover Markdown (no vscode import)
  platform/          File-system adapters: vscode.workspace.fs and the tsserver host
```

## Code style

- Node.js 22+, TypeScript.
- Lint with ESLint ([eslint.config.mjs](eslint.config.mjs): recommended + typescript-eslint).
- Match existing patterns; keep diffs minimal; one concern per PR.
- Before finishing a change: `npm run lint`, `npm run typecheck`, `npm test` as appropriate.
- Behavior changes need:
  1. A positive test for the new behavior
  2. A negative / non-interference test (ordinary TypeScript navigation unchanged)
  3. Updates to `examples/` and the README when user-visible behavior changes

## Red lines

- Do not import `vscode` from `shared/` or `preview/`.
- Detect imports with the TypeScript AST only — never regex-parse source.
- Do not execute project code (for example `vite.config.*`). Do not scan the workspace recursively.
- Return nothing outside an exact supported asset import. Do not globally suppress or rewrite ordinary `.d.ts` / TypeScript navigation.
- Prefer false negatives: a missing file means no result, never a guess.
- Public shapes in `shared/model/` are frozen; changing them needs fixtures and tests in the same PR.
- Non-goals: CSS Modules IntelliSense (`styles.className` → selector), multi-IDE support, replacing the TypeScript language service.
- Do not log file contents in debug output. Do not ship unsafe SVG/HTML preview paths (follow SECURITY.md / hover sanitizer rules).
- Report vulnerabilities privately per [SECURITY.md](SECURITY.md) — do not open public issues for security problems.

## Agent process

One focused change at a time. Stay within CONTRIBUTING red lines and README-documented behavior. Escalate frozen-contract changes in `shared/model/` instead of quietly rewriting them.
