---
kind: decision
applies-to: [general, load-bearing]
created: 2026-10-12T20:15:42-07:00
---

# Every piece of crew state has exactly one home

- **Who runs what:** `claude agents --json` joined to claims (`sessionId`) and launch titles.
  Never a hand-kept slot list.
- **Questions for Anton:** the worker's `in-flight.md` *Needs you* (committed, pushed).
  Phase 3's park entries live there too. No local `crew/parked/` store and no `questions.ts`.
- **`run.md` (local, overseer-only):** caps, the overseer id, ship answers (phase 1 only;
  phase 2 moves them to `ship:` via `spec.ts ship`), when each question was asked and
  answered, pending launches, and the last 30 log lines.
- **Ship mode:** the spec's `ship:`, then the project's `pr.ship` (phase 5). Not under `crew:`.

Why: every copy drifted in review scenarios, for example a crash, a manual `claude stop`, or
compaction between launch and write. Review 2026-10-12, consensus of 3–4 reviewers.

The pick rule skips:
- `code: false` task phases (`board/lanes.ts:145` puts `next: "execute"` on every row)
- `readyIn` / `onlyOn` rows
- a second worker on the same spec (phase 1)
