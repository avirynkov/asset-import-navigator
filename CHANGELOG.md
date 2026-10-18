# Changelog

Releases are managed by [release-please](https://github.com/googleapis/release-please). Merging the Release PR updates this file and cuts the `v*` tag.

## [0.0.2](https://github.com/avirynkov/asset-import-navigator/compare/v0.0.1...v0.0.2) (2026-10-18)


### Bug Fixes

* use RELEASE_PLEASE_TOKEN so tag pushes trigger release.yml ([adb54b9](https://github.com/avirynkov/asset-import-navigator/commit/adb54b939c11d77b62de4edb11e424560dd83633))
* use RELEASE_PLEASE_TOKEN so tag pushes trigger release.yml ([6514105](https://github.com/avirynkov/asset-import-navigator/commit/6514105fa8c0dcbb6ba5eb0ed129867e980f5fee))

## 0.0.1 (2026-10-18)


### Features

* phase 5 asset hover and SVG preview ([7e3f5c8](https://github.com/avirynkov/asset-import-navigator/commit/7e3f5c85e6d3e18c850b8f3a12d7d77cfe40f869))


### Bug Fixes

* address code review findings in hover preview, sanitizer and caches ([887fea9](https://github.com/avirynkov/asset-import-navigator/commit/887fea958fb1950ba4e6a59c2a2a293643255d9c))
* revalidate cached asset resolutions and bound cache growth ([dd6df77](https://github.com/avirynkov/asset-import-navigator/commit/dd6df770a35a9c4f210ac926ed7f819a7c9202dd))
* ship typescript at runtime and use tsserver's TypeScript in the plugin ([a26ff7c](https://github.com/avirynkov/asset-import-navigator/commit/a26ff7c759d0ec6dcf60d9079373df6b9c682a2d))

## [0.0.1]

First public preview.

### Features

- Go to Definition, Cmd/Ctrl+Click and Peek on supported asset imports open the physical file via a TypeScript server plugin (Mode A); no configuration required.
- Document links on asset import paths (TS/TSX), and a narrow fallback definition provider for environments where the plugin can't load (Mode B, e.g. native TypeScript / tsgo).
- Asset hover with a sanitized SVG thumbnail, path, size and dimensions; stylesheet hover with module/plain type.
- Resolution through relative paths, `tsconfig.json` / `jsconfig.json` `paths` (with `extends` and wildcards), and the `assetImportNavigator.aliases` setting. Vite queries (`?react`, `?url`, `?raw`, …) and hashes are stripped.
- Supported assets: `.svg`, `.css`, `.scss`, `.sass`, `.less`, including `*.module.*`.
- Settings: `enabled`, `extensions`, `aliases`, `queryPolicy`, `hover.enabled`, `hover.svgPreview`, `hover.maxPreviewBytes`, `debug`.
- Works in Restricted Mode (untrusted workspaces); there, workspace-level `assetImportNavigator.aliases` is ignored. Virtual workspaces are not supported.
- Supports VS Code 1.85 and later.

### Known limitations

- Mode B can't remove TypeScript's own `.d.ts` result, so Peek may list both.
- `styles.someClass` selector navigation is out of scope.
- Remote SSH / WSL / Codespaces haven't been tested.
