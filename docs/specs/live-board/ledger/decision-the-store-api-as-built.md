---
kind: decision
applies-to: [phase 2+]
created: 2026-11-11T20:09:56-08:00
---

# The record store's API as phase 1 built it

Later phases call these; the shapes differ a little from `technical.md` → *Writing*.

- `writeRecord(port, plan, { validate })` (`record/write.ts`). The validator is the third argument: phase 2's
  `plan/kinds.ts` passes its path → reader registry here. A plan may return `message` with its ops (the
  commit message, e.g. `record: tick 2.3`).
- `writeRecord` returns `offline`, never `queued`. Only `sendIntent(port, outboxDir, intent, runners, …)`
  (`record/outbox.ts`) queues, and returns `RecordWrite` with `queued`. A command that may run offline calls
  `sendIntent` with its intent and registers a runner for the intent's `command`; one that must refuse
  offline (join, card add) calls `writeRecord` and reports `offline` as a refusal.
- An intent whose `command` has no runner stays queued (`flushOutbox` skips it) for a plugin version that has
  one; it is never marked refused by an older version.
- `conflict` without `current` means the document was deleted under the caller. Updating or deleting a
  missing document without `ifVersion` is `invalid` (`<path> does not exist`).
- Patches are RFC 7386: `null` removes a field.
- `core/land-on-ref.ts` runs over a `RefPort { fetchTip, commit, push }`, not a `Git`, so tests drive it with
  `tests/fake-ref.ts`. Phase 6 makes `landOnMain` a caller through a branch port: `fetchTip` = `pinDefault`,
  `commit` = blobs + `commitOnto`, `push` = `leasePush` on `refs/heads/<branch>`.
- Tests: `fakeRecord()` and `viewOf(docs)` in `tests/fake-record.ts`.
- A save is about a dozen git spawns plus one fetch and one push (0.5–0.9 s on a loaded Mac against a local
  origin). Cutting the spawns (one `mktree`, `cat-file --batch`) would roughly halve the local part; Anton,
  2026-11-11: "no optimizations are needed at a moment". Don't take it up unless a phase measures a problem.
