---
needs: [2]
pr: A
---

# Phase 3 — Command tests can take the fakes

**Goal:** every record-writing command can be handed fake record ports through its deps, reads and writes
together, with production behaviour unchanged, and the git each phase 4–8 target reaches is mapped.

**Outcome:** nothing changes for anyone using the plugin; record-writing commands can now be tested on fakes, reads and writes together · a day · medium risk: touches every record-writing command, guarded by the existing (still real-git) tests passing unchanged

**Files to touch:**
- `skills/spec/tools/core/git-seams.ts` (new), `plan/record-send.ts`, `plan/read-plans.ts`, `plan/phase-writer.ts`, `plan/write-notice.ts`
- `skills/spec/tools/commands/plan.ts`, `session.ts`, `card/land.ts`, `card/send.ts`, `join.ts`, `join-from-tree.ts`, `join-tidy.ts`, `record-export.ts`, `record.ts`, `question.ts`, `spec-field-write.ts`, `phase/context.ts`
- `skills/spec/tools/tests/stub-runner.ts` (`strictRunner`, `gitStub`), `command-deps.ts` (new), `record-factories.ts`, `tree.ts`, `joined-repo.ts`, `git-seams.test.ts` (new)

## Implementation guidance

`technical.md` §4–5 hold the contracts; `reviews/2026-11-13-seam-reach.md` says why the seam is one `GitSeams`
bundle and not per-type fields. Pure refactor: `seams?` defaulted to today's code, so every existing test passes
unchanged — that is the safety net, so per commit run `test:fast` plus the `.git` files covering what you touched,
and end with a full `bun test`.

Order:
1. **The trace first.** Wrap the runner in a recording one and run each phase 4–8 target test file once. Write the
   argv per command into `technical.md` §4, each marked seam or stub. That list decides what `gitStub` answers and
   whether phase 3a's seams cover the rest; if a target can't leave real git, say so in its phase now.
2. `GitSeams` + `recordPortsOf` (unit-tested on the fakes), then `recordWorld` on it.
3. Route each command one at a time. Branch lookups stay where they are; refusal lines stay exact.
4. The read helpers take deps.
5. Test helpers: `joinedDocs` first and switch `joinedRepo` to it (one seed source), then `strictRunner`/`gitStub` and
   the `command-deps.ts` builders. Prove them with one record-write test on no real git; land and claim come in 3a.

## Deliverables

- [x] Trace: run each phase 4–8 target test once under a recording runner; list every git argv per command in `technical.md` §4, each marked "seam" or "`gitStub` answer"
- [x] `GitSeams` + `recordPortsOf(git, deps)` (write port and a linked read port) with unit tests on fakes; `recordWorld` built on it, still keeping a port without a branch
- [x] Route plan, session, card/land, join, join-from-tree, record-export, record through `recordPortsOf`, each keeping its own branch check and refusal order; `record status` via `read.trackingTip()`; existing tests unchanged and green
- [x] Read helpers take deps: `readPlans` gets `read` in its options (default keeps `fetchTimeoutMs`); `readPlansAt`/`readLocalPlans`/`plansOnDemandAt` take `{ runner, seams? }`; phaseContext, write-notice, question, card send, spec-field-write, join-tidy pass deps
- [x] `joinedDocs` (+ `joinedRepo` uses it), `joinedFiles`, `withSettings`, `gitStub` as a `strictRunner` in `stub-runner.ts`, `command-deps.ts`; one record-write test running with no real git
- [x] doctor-file on fakes: `spec.ts run()` passes a runner to `doctor` (it asks git for origin through `readPlans`); `doctor-file.git.test.ts` → `doctor-file.test.ts`, its allowlist line removed, `REAL_GIT_CAP` lowered

## Phase-local notes

- Split brain is the failure mode: a command test on fakes must not reach real git anywhere. `gitStub` throwing on
  unknown argv catches it on the injected runner; the `test:fast` tripwire catches a default runner leaking.
- `branchPort` stays private: faking it gains nothing while `planAt` still runs `git archive`.
