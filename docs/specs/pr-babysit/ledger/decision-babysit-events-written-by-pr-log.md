---
kind: decision
applies-to: [phase 7, 8]
created: 2026-10-10T16:57:59-07:00
---

# The babysit procedure writes its own log events through `pr log` flags

Phase 2 declared `babysit-start`, `pushed` and `stopped`, and `pr wait --since` plus the 3-hour and
3-fix-push limits read them, but no command wrote them (found in phase 7). Now:
`pr log <n> --start <spec> --group <g>` starts the clock (after `pr open`, which pins `<n>`),
`pr log <n> --pushed` logs HEAD's sha and subject after a **fix** push, `pr log <n> --stopped "<why>"`
before asking the user. A conflict merge or a retrigger commit logs a `--add` note instead, so it never
counts as a fix push. One write per call.

Rejected: logging pushes from `spec.ts push` (it would need gh to find the PR, and couldn't tell a fix
push from a conflict merge); `pr open --babysit` (open also serves the draft and merge-now answers).
