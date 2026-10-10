---
kind: gotcha
paths: [skills/spec/tools/hooks/**]
seen-in: [self-driving-loop]
created: 2026-10-10T13:47:09-07:00
---

# A hook's `payload.cwd` is the session's current folder, not the project root

Hook payloads carry `cwd` = the session's working directory, which moves when the session `cd`s (Claude Code even fires `CwdChanged`). Resolve the project from it with `findProjectDir(payload.cwd)` (`core/spec-folders.ts`, once self-driving-loop phase 4 lands), never use it as the project dir directly.

Evidence: `hooks/lesson-recall.ts:23` and `hooks/spec-file-check.ts:86` took `payload.cwd` as the project dir. After `cd docs/specs/foo`, lesson recall found no `_ledger` and went silent, and spec-file-check loaded no spec nodes, so a valid `needs: [other-spec#2]` was reported as unresolved and blocked the edit. `~/.claude/hooks/REFERENCE.md:16,42`.
