---
kind: decision
applies-to: [phase 4+]
created: 2026-11-12T01:44:30-08:00
---

# The plan-changed notice as phase 3b built it

What later phases build on, and where it differs from `technical.md` → *Knowing the plan changed*:

- **Memory** (`plan/plan-version.ts`): one JSON file per session id in `tmpdir()`
  (`spec-driven-plan-<id>.json`) holding, per spec, the plan **shape** last shown (`PlanShape`: version,
  phase ids, PR, needs, task ids; `plan/plan-diff.ts`), not only the number: the record keeps no history to
  diff an old version against. It also holds the hook's last fetch attempt `{ at, ok }`.
- **Session key:** `CLAUDE_CODE_SESSION_ID` in commands and packs, `session_id` in the hook payload (same id).
  Memory comes in as `PhaseDeps.memory` / `ContextDeps.memory`; `systemPhaseDeps` and `systemContextDeps`
  fill it. Tests that pass none see no notice, so existing line assertions hold.
- **Writes** (`plan/write-notice.ts` `withPlanNotice`, wrapped round every record-writer action): the diff
  is against the view the write's plan last ran on (`RecordWorld.watch`, set in `sendRecordIntent`), so a
  session's own add or split is never reported back; a landed write then remembers the post-write tip from
  the tracking ref (no fetch). The line rides on `PhaseOutcome.notice` and prints **before** the result
  line, refusals and dry-run `invalid`s included.
- **Packs:** under the `Board:` line (`commands/context.ts` `withBoardLines`). A first sight only remembers.
- **Hook** (`hooks/plan-changed.ts`): checks only specs already in this session's memory, so a session that
  never loaded a joined spec does no read at all. The attempt is written before the fetch. Fetch only when
  `board.record` is on, with `fetchTimeoutMs: 3000` (`readPlans` option). Its lines are prefixed
  `<spec>: ` since it may cover several specs.
- **Fetch:** a fetch that ran out of time is `offline` with no follow-up `ls-remote` (`record/ref.ts`,
  `ranOutOfTime` in `core/run.ts`): every offline write used to wait two limits.
- **Not wired:** `record sync` and `join` print no notice; the Codex runtime pack passes no memory.
