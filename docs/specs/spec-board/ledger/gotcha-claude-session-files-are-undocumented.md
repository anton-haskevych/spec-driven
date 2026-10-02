---
kind: gotcha
applies-to: [phase 4+]
created: 2026-10-01T14:01:46-07:00
---

# `~/.claude/sessions/<pid>.json` is undocumented: liveness must fail toward "unknown"

These files are a Claude Code internal. If their format or location changes, or the folder can't be
read, the claim system must not conclude that every session is gone. Otherwise every claim reads
`closed` and every session takes over every phase.

- `loadLiveSessions` returns a `Result`. On failure, liveness is `unknown`, and `unknown` claims are
  never taken over.
- A file counts only when its pid is alive **and** that process's start time (`ps -o lstart=`) equals
  the file's `procStart`. A file left behind by a crash or reboot, whose pid now belongs to something
  else, is dead.
- `procStart` is written in **UTC** (`Thu Oct  1 22:53:33 2026`), but `ps -o lstart=` prints local time.
  Run `ps` with `TZ=UTC` and compare with whitespace collapsed, or every session reads dead.
- `sessions/live.ts` is the only reader. Fields seen on 2026-10-01 (CLI 2.1.287): `pid`, `sessionId`,
  `cwd`, `startedAt`, `procStart`, `kind`, `name`, `status` (busy|idle), `updatedAt`.
- `cwd` is the start directory. Sessions that `EnterWorktree` keep main's path, so join sessions to rows
  through claim `sessionId` first.
