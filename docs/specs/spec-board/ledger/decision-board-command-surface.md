---
kind: decision
applies-to: [general]
created: 2026-10-01T14:01:46-07:00
---

# `list` with no filter is the board; filters keep the table; agents use `spec.ts board`

| Call | Result |
|---|---|
| `/spec list` with no filter | Board |
| `/spec list <filter>` and `list table` | Today's table, unchanged and sync (`portfolioTable`) |
| `list --json` | Unchanged |
| Lane views (`ready`, `blocked`, …) | `spec.ts board <lane>` |
| Handoff and execute (agent feed) | `spec.ts board --json [--local]` |

`board` is a tool command, not a `/spec` sub-command, so the agentic-only rule holds. `--local` skips
the fetch, gh and the sessions source; claims are still read.

Rejected:
- Lane words as `list` filters. `list blocked` already filters by status, and idea and prep dedupe
  pass free words to `list`.
- A `board` key inside `list --json`. Every agent call would carry backlog bodies, a fetch, the
  workspace scan and gh.

Source: `reviews/2026-10-01-pre-build-collegium.md` L2, L3.
