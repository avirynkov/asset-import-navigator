## What and why

<!-- One change per PR. Link the issue it addresses. -->

## Checklist

- [ ] Tests for the new/changed behavior
- [ ] **Negative / non-interference test**: ordinary TypeScript navigation, package imports, real `.d.ts` symbols and `styles.foo` are unchanged
- [ ] `examples/` and README updated if user-visible behavior changed
- [ ] Compatibility considered (Mode A tsserver plugin / Mode B fallback, bundled vs workspace TS, multi-root)
- [ ] No execution of project code, no recursive workspace scans, no global `.d.ts` filtering
- [ ] `npm run lint && npm run typecheck && npm test` pass locally (`npm run test:e2e` for navigation changes)
- [ ] CHANGELOG `[Unreleased]` updated, or the `skip-changelog` label applied
