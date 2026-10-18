# Repository labels

Create these once (Settings → Labels, or `gh label create <name>`). Issue forms and triage rely on them. Version bumps and changelog text come from release-please (Conventional Commits), not from these labels.

| Label | Use |
|---|---|
| `bug` | Something behaves incorrectly |
| `enhancement` | New feature or improvement |
| `compatibility` | Environment-specific (TS version, tsgo, remote, other extensions, OS) |
| `regression` | Worked in an earlier version |
| `performance` | Latency or resource usage |
| `security` | Security-relevant change (report vulnerabilities privately, see SECURITY.md) |
| `documentation` | Docs, README, examples |
| `dependencies` | Dependency updates (Dependabot) |
| `release` | Release preparation |
| `triage` | Needs maintainer review |
| `needs-repro` | Waiting for a reproduction |
| `skip-changelog` | Excluded from release notes |
| `breaking` | Breaking change (major version) |
