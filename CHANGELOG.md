# Changelog

All notable changes to this extension are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

First public preview. (Replace "Unreleased" with the release date when tagging `v0.1.0`.)

### Added

- Go to Definition, Cmd/Ctrl+Click and Peek on supported asset imports open the physical file. This comes from a TypeScript server plugin (Mode A) and needs no configuration.
- Document links on asset import paths (TS/TSX), and a narrow fallback definition provider for environments where the plugin can't load (Mode B, e.g. native TypeScript / tsgo).
- Asset hover with a sanitized SVG thumbnail, path, size and dimensions; stylesheet hover with module/plain type.
- Resolution through relative paths, `tsconfig.json` / `jsconfig.json` `paths` (with `extends` and wildcards), and the `assetImportNavigator.aliases` setting. Vite queries (`?react`, `?url`, `?raw`, …) and hashes are stripped.
- Supported assets: `.svg`, `.css`, `.scss`, `.sass`, `.less`, including `*.module.*`.
- Settings: `enabled`, `extensions`, `aliases`, `queryPolicy`, `hover.enabled`, `hover.svgPreview`, `hover.maxPreviewBytes`, `debug`.
- Works in Restricted Mode (untrusted workspaces). Virtual workspaces are not supported.
- Supports VS Code 1.85 and later.

### Known limitations

- Mode B can't remove TypeScript's own `.d.ts` result, so Peek may list both.
- `styles.someClass` selector navigation is out of scope.
- Remote SSH / WSL / Codespaces haven't been tested.
