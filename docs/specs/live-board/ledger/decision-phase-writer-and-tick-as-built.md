---
kind: decision
applies-to: [phase 3a+]
created: 2026-11-12T00:47:04-08:00
---

# The PhaseWriter port and the record tick as phase 3 built them

What 3a and later phases build on, and where it differs from `technical.md`:

- **Port.** `phaseWriterFor(projectDir, spec, plans, deps, workflow)` (`plan/phase-writer.ts`) returns
  `fileWriter` (`plan/file-writer.ts`), `recordWriter` (`plan/record-writer.ts`) or, for a Codex pilot on a
  joined spec, `refusingWriter`. Methods: `tick | park | unpark | deployed | add | split`; 3a adds `move`
  and `set`, and replaces the record writer's `notYet` refusals. Outcomes are
  `landed | unchanged | invalid | refused | queued`; `renderPhaseOutcome` is the one renderer
  (`invalid` → `phase <action>: …`, `refused` → `<action>: refused, nothing written. …`).
- **Actions** in `commands/phase/<action>.ts` get a `PhaseContext` (`writerFor`, `isJoined`, `deps`); the
  dispatcher reads the record once per command with `readPlansAt` (fetches when the board is on).
  `phaseCommand(dir, args, workflow?, deps?)`: real-git tests pass `{ runner, env, now }`.
- **Task close fields.** `doneAt`, `doneBy` (session id), `doneIn` (tree folder name). "Already done" =
  same session id, or with no session id the same tree and commit.
- **Intents.** `plan/intents.ts`: `INTENT_PLANNERS` (pure, for the read overlay) and `intentRunners(git)`
  (for flushes: a queued tick pushes its commit first). A runner may return `{ offline }`
  (`record/outbox.ts` `IntentRun`), which keeps the entry queued. `sendIntent` takes an optional `plan`
  so a caller can watch what its own plan saw. `record sync` now gets the real runners and validator.
- **Overlay.** `readPlans` lays every queued, unrefused intent of this clone over the view
  (`record/overlay.ts`), not only this session's; `PlanSource.pending` counts them for the `Board:` line.
- **Push.** `pushBranch(git, base, SAVE)` returns `pushed | offline | rejected | refused`; `pushResult` maps
  it back for `spec.ts push`, publish-docs and pr open. A pre-push hook failure reads as `rejected`; an auth
  failure with prompts off reads as `offline` (no porcelain line, a `fatal:`).
- **Evidence.** A code task: `<full sha> on origin/<branch>`, plus ` · <text>` when `--evidence` is given.
  Task phases and `Gate:` items push nothing.
