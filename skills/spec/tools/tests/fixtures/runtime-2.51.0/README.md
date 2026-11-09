# Historical reader fixtures

These seven modules are actual source from spec-driven 2.51.0 at `22e7ec7b6aae89c4a13c299e1dff024a26a1d1bc`, obtained with `git show`. Only module specifiers were relocated, using ast-grep import-source ranges. `manifest.json` records original SHA-256 values and reversible import substitutions. The provenance test hashes the restored original text, including comments. No method bodies were rewritten.

Frozen together: claim parsing/storage/atomic operations, held-claim evaluation, claim status, tree occupancy and prune discovery/policy. Shared Result/frontmatter/Git/workspace/formatting/CLI utilities and Claude session parsing are imported from the repository; they are unchanged behaviorally at capture time. This is a historical reader fixture, not a completely vendored 2.51.0 plugin installation. If a shared dependency changes historical behavior or types, pin that dependency here rather than edit these reader bodies to pass.

The tests run only in disposable directories/local Git repositories, with GitHub stubbed. They demonstrate unsafe old-reader interpretations. They do not authorize mixed writers or prove native resume/install fencing. No fixture is imported by production.
