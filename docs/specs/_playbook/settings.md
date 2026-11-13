---
pr:
  draft: false
  merge: squash
gates:
  per-commit: per-commit
---

# Project settings — spec-driven plugin

Plugin PRs open ready and squash-merge (one release commit per PR, as #21 and earlier landed).

Each commit runs `bun run test:fast` (`gates.md` → *per-commit*): seconds, no real git. The full suite runs at the PR gate and in CI.
