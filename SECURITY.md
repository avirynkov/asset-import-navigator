# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report it privately through GitHub's private vulnerability reporting:
**[Report a vulnerability](https://github.com/avirynkov/asset-import-navigator/security/advisories/new)**
(or **Security → Advisories → Report a vulnerability** on the repository page).

Please include the affected version, the steps or file needed to reproduce it, and its impact. You'll get an acknowledgement through the advisory thread. The fix and its disclosure will be coordinated there.

## Supported versions

Only the latest released version gets security fixes.

## Threat model

The extension reads files from your workspace and displays information about them. It does not run project code, start processes or make network requests.

| Surface | Risk | Mitigation |
|---|---|---|
| SVG hover preview | An SVG with scripts or remote content could execute or leak data when rendered | The SVG is shown as a `data:image/svg+xml` image in an **untrusted** Markdown hover (`isTrusted = false`, no HTML). Files containing `<script>`, `javascript:`, event handlers, remote `href`/`xlink:href`, `<!ENTITY>` or an external `<!DOCTYPE>` are rejected, and the hover falls back to metadata only. Files larger than `hover.maxPreviewBytes` are never read for preview. |
| Path resolution | Navigation to unexpected files | Only the computed candidate path is checked; there is no directory scanning. Non-existent targets produce no result. |
| Configuration | Executing project config | `vite.config.*` is never executed; only `tsconfig.json`/`jsconfig.json` are parsed, as JSON. |
| Debug logging | Leaking source | The debug channel logs modes and resolved paths, never file contents. It is off by default. |
