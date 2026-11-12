---
kind: decision
applies-to: [general, load-bearing]
created: 2026-11-11T19:41:31-08:00
---

# A record write is a plan function re-run against each fresh tip

`writeRecord(port, plan)` runs `plan(view)` on every attempt, against the record it just fetched. A tick
reads the phase document as it is now and sets one task done. A plan change computes `planVersion + 1`, the
next task id or the next card number there, and re-checks edges and cycles there. The outbox stores the
**intent** (`{ command: "tick", args }`), never operations pinned to versions, and replays it the same way.

**Rejected:** fixed `RecordOp`s with `ifVersion` on every update, as the Academy store does. Its
`mergePatch` replaces arrays whole (`crm/ops/src/academy-board/doc-writes.ts:35-43`), so a tick rewrites a
phase's whole task list: two ticks of one phase conflict, every plan change on a spec collides on
`spec.json`, and a session's second offline tick is rejected by its first.

**`ifVersion` is kept only** where a value someone looked at is being changed: page edits, `card update`,
`card tag`, `question answer`.

**A tick never raises `planVersion`.** Every plan change does, and writes `spec.json`, which is what makes
two plan changes see each other.

Never build a command's ops before calling `writeRecord`. If a value depends on the record, compute it inside
the plan. Source: review 2026-11-11, R1 (four reviewers independently); the exemplar is
`core/land-on-main.ts:23-38`.
