# Phase 3b recon — a session hears that the plan changed

Inline recon (one wave; Stage B and the 3a as-built ledger already named the seam). Paths under `skills/spec/tools/`.

## Seam

- **Pack:** `commands/context.ts:103-107` `withBoardLines` puts `boardLine` + `treeAheadLine` (`context/board-lines.ts`)
  on top of every pack for a joined spec. The plan-changed line goes in the same list. Session id is
  `ownSessionId(env)` (`sessions/own.ts`, `CLAUDE_CODE_SESSION_ID`); `ContextDeps` has no env yet.
- **Write results:** every record write goes through one chokepoint, `sendRecordIntent`
  (`plan/record-send.ts:47-50`), called by `recordTick` (`plan/record-tick.ts:46-50`) and `recordPlanCommand`
  (`plan/record-plan.ts:24-45`). `recordWriter` (`plan/record-writer.ts`) builds a fresh `RecordWorld` per call.
  Outcomes render in one place, `renderPhaseOutcome` (`plan/phase-writer.ts:64-77`). Spec.ts commands print their
  result last, so the notice goes before the result line.
- **Post-write tip:** a landed push updates `refs/spec-board-remote/record` (`record/ref.ts:24-27`), so a
  local read (`readLocalPlans`, no fetch) after a write sees exactly the tip this write made.
- **Before-edit hook:** `hooks/lesson-recall.ts` is the pattern: `findProjectDir(payload.cwd)`, a tmpdir file
  named by session id, `import.meta.main` block that fails open. SKILL.md frontmatter `PreToolUse`
  `Write|Edit|MultiEdit` gets a second command.
- **Fetch:** `fetchRecordTip` (`record/ref.ts:37-52`) uses `NETWORK` (10 s). The hook needs 3 s: a port option.
  `readRecord(port, { fetch, now })` (`record/read.ts`) with `fetch` = `loadSettings(dir).board.record`.

## Reuse

- `readJoinedPlan(view, spec)` gives `SpecDoc.planVersion` + `PhaseDoc[]` (id, pr, needs, tasks with ids):
  everything the diff needs.
- `sendRecordIntent` can wrap the caller's plan to watch the view it last ran against (the tip that landed,
  before this command's own ops) — the same trick `recordPlanCommand` uses with `see`.

## Testing-issue estimate

- The diff and the memory are pure / tmpdir-only: unit tests with `phaseDoc`/`task`/`specDoc` factories.
- The hook decision (throttle, back-off, once per version) takes `now`, a memory and a read function: unit
  tests with no git. The offline 20-edit test runs the hook function in-process against a clone whose origin
  is unreachable (`isolatedRunner`).
- Write-result integration: `tests/record-plan-changes.test.ts` style (`joinedRepo`, two clones, real git).
- Size: `commands/context.ts` 127 lines, `record-send.ts` 57, `record-writer.ts` 64 — room. No file near 250.
- Memory file must tolerate garbage (corrupt JSON → empty memory), as `lesson-recall` tolerates a missing file.
