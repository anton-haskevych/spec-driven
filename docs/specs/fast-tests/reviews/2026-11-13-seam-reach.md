---
date: 2026-11-13
spec-phase-at-review: Phase 1 — Guard and two speeds (0 of 9 done)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: seam-reach
---

# Review — seam-reach

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

The spine holds. All five reviewers agree on it: a guard test instead of a reviewer, `*.git.test.ts` as the tier marker, contract-tested fakes before any migration, optional deps fields defaulted to today's code, and argv stubs that throw. Verdict from all five: fix-then-proceed.

What's wrong is the **reach of the phase 3 seam**. The spec routes fakes through `recordAccess` plus four `<Thing>Deps` types. But the commands phases 4–8 migrate reach git through three paths those fields never touch:
- **Board load.** `loadBoardInputs` → `loadMainline` does a pin fetch, `git log`, a `git archive` base cache and a real `readPlans`. Workspace scan and `worktree list` also run here. Every claim, board, page, trees-place and crew-tick test goes through it.
- **Plan reads that take a positional `runner`.** `readPlansAt`, `readLocalPlans` and `plansOnDemandAt` are called from `phaseContext`, `withPlanNotice`, question, card send and spec-field-write.
- **Lands that take `runner` or `git`, not deps.** `landSpecField`, `deployedOnMain`, `landFocus` and `mergePr`.

As written, phase 4's headline (claim-command, 50 s → under 1 s) is unreachable. Phases 5–7 would write to the fakes and read from real git, the split brain the design rejects.

Two smaller things:
- **`recordAccess` changes behaviour.** Its three-kind union adds a default-branch lookup, which can fall back to `gh`, to four commands that only need origin today. So it is not the pure refactor phase 3 promises.
- **The fast tier has no runtime guarantee.** The guard scans imports only. Production code with a hard-wired or defaulted `systemRunner` still spawns real git from a "fast" test, and silently takes a fallback branch.

The rest is guard precision: check 5 is red on day one, `scanImports` can't see named imports, the cap uses `<=`, and check 4 misses repos built in test bodies. Plus contract gaps (read port, tracking ref, land, `hasBranch`) and phase hygiene.

## Forks put to the user

1. **The project lesson vs the guard** (prior-art F1).
   - Option A: the lesson stays visible (no `enforced-by`), so the before-edit hook shows the rule. The brief promised this.
   - Option B: follow the house rule. A guarded lesson gets `enforced-by` and recall stops showing it. A visible lesson would later be flagged by `lessons candidates` as unguarded.
   - **Anton: follow the house rule.** The lesson is written with `enforced-by: skills/spec/tools/tests/real-git-allowlist.test.ts`. The guard's red message is the teaching moment, and `principles.md` §13 is the standing prose. The brief's bullet becomes "shown when the test first runs".

## Resolved by the synthesizer

- **Seam: one `GitSeams` bundle, not per-field sprawl.** It holds `recordPorts(git)`, `mainline`, `land` and `remote(git)`. It enters as `seams?: Partial<GitSeams>` on `BoardRunners`, `PhaseDeps`, `JoinDeps`, `RecordDeps`, `FieldWriteDeps` and `MergeDeps`. `BoardDeps`, `ClaimDeps`, `PageDeps` and `PlaceDeps` inherit it through `BoardRunners`. A new adapter is then one field, and there is one place to see what is injectable. It is still "optional field, defaulted at the use site", not a global world.
- **`recordAccess` → `recordPortsOf(git, deps) → { port, read } | undefined`.** Commands keep their own `defaultBranch` calls in their current order. `recordWorld` gains `read` and keeps "port without branch". This rejects the three-kind union.
- **Phase 3 starts with a trace.** Run each phase 4–8 target test once under a recording runner and list every git argv per command in `technical.md` §4. Each argv is then either behind a seam or answered by `gitStub`. The phase-4 headline gets re-checked against that list.
- **Phase 3 split into 3 (record ports, reads, helpers) and 3b (board-load/mainline, land, remote).** Phase 3 had grown two jobs. Phases 4–7 need 3b, and phase 8 needs only 3.
- **Runtime tripwire in `test:fast` (phase 1).** A `git` shim first on `PATH` fails, and the run lists the argv. It catches production defaults, CLI subprocesses and helpers at any depth. The static scan stays for naming. The `systemRunner` import rule is dropped, so `run.test.ts` stays fast.
- **Guard precision.**
  - Check 5 gets a shrinking exception set: `crew-deps.ts` until phase 8. Fixtures may import `git-repo`.
  - Imports resolve with `Bun.resolveSync` into the full transitive closure over `tests/`, not string match plus one level.
  - The cap check is `===`.
  - Check 4 is flipped: a repo builder is allowed only inside `beforeAll`. Inside `test`, `it` or `beforeEach`, or a same-file helper called from them, it fails.
  - The guard enumerates bun's collection under `skills/` (minus fixtures).
  - The guard splits into data (`tests/real-git/allowlist.ts`), scan (`tests/real-git/scan.ts`) and a thin test.
- **Per-commit bar for phases 3–8.** `test:fast` plus every `*.git.test.ts` that covers a touched module. Each phase ends with a full `bun test`. Without this, the phase-3 refactor's safety net (the real-git tests) would not run until the PR.
- **Contract additions.**
  - A read-port contract. A push moves the tracking tip, an absent record clears it, and `markFetched` survives a new port. Port and read are built as a linked pair from one fake.
  - `hasBranch` true/false/unreachable cases in the remote contract.
  - The real `make()` reuses the `beforeAll` repo and deletes the record and tracking refs between cases.
  - A small land contract (landed / unchanged / refused / offline) on `landOnMain` and the fake `land`, which keeps a `main` file map separate from the tree.
- **`gitStub` lives in `stub-runner.ts`.** It is a `strictRunner(canned)` with named answers: open, throwing, and with a fallback typed as canned answers, never a `Runner`. That follows prior-art's exemplar and code-quality's split-brain concern.
- **`readPlans` takes `read` in its options.** The default keeps `fetchTimeoutMs`.
- **`record status` goes through `read.trackingTip()`.** `record sync`'s `refreshRecordCopy` gets a `mirror` seam (or `gitStub` answers, per the trace).
- **`phase/deployed.ts:15` passes `context.deps.runner`.** Today it silently uses `systemRunner`.
- **One PR stays.** That was Anton's explicit call. Integration-architect found low overlap with the open phases of live-board, spec-loop-automation and pr-babysit. Phase 1 notes that renames are rebased after each neighbour merge, and that a cap conflict is resolved by re-running the guard.
- **`@ast-grep/napi`** is recorded as a dev-only exception to `ROADMAP.md`'s "zero dependencies" (it never ships to users). TS 7 has no in-process AST API. CI must install the linux binary from the lockfile.
- **Migration coverage.** Each migration phase's handoff lists the test names it removed and where each git behaviour is still proven.
- **Phase 9 adds a `restore()` reset helper** in `git-repo.ts` and explicit `beforeAll` timeouts.
- **`board-command` (SMOKE-ONLY in wave 1) was in no phase.** It goes to phase 4, which shares the board-load seam.

## Findings

| # | Finding | Signal | Severity | Verified | Raised by | Action |
|---|---|---|---|---|---|---|
| 1 | Board load (`board/load.ts:62-80` → `mainline/load.ts:39-50`) has no seam. Claim, board, page, trees-place and crew-tick can't run on fakes, so phase 4 is unreachable. | consensus | critical | verified (`commands/claim.ts:66-72`, `board/load.ts:62-80`, `mainline/load.ts:39-50`) | PE F1, IA F1, CQ F2 | phase 3b mainline seam + trace |
| 2 | Plan reads go through positional `runner` (`readPlansAt` etc.), so faking writes leaves reads on real git. | consensus | high | verified (`commands/phase/context.ts:26`, `plan/read-plans.ts:79-98`) | PE F2, IA F3, CQ F2 | `recordPorts` threaded through the read helpers via deps |
| 3 | `land?` is placed on deps that 5 of 6 land callers never receive (`landSpecField(projectDir, runner, …)`, `deployedOnMain(…, runner = systemRunner)`, `landFocus(git)`, `MergeDeps`). | consensus | high | verified (`core/land-spec-field.ts:25`, `phases/deployed-land.ts:14`) | PE F2, IA F2, CQ F3 | `GitSeams` on `FieldWriteDeps` / `MergeDeps`; signatures take deps |
| 4 | Deps-field table misplaced: `BoardDeps` fields never reach `loadBoardInputs(…, runners: BoardRunners)`; `ClaimDeps extends BoardDeps`, so the listing is duplicated. | consensus | high | verified (`board/load.ts:41-45,62`; `commands/claim.ts:28`) | CQ F3, PA F2, IA F10 | one `seams` field on `BoardRunners` |
| 5 | `recordAccess` union adds a default-branch requirement (and a possible `gh` call) to session end, record sync, record-export and join-from-tree. | consensus | high | verified (`plan/record-send.ts:33-51`, `commands/session.ts:55-62`, `commands/record.ts:56-58`) | PE F3, CQ F1, IA F4, PA F3 | `recordPortsOf`, branch stays per command |
| 6 | `gitStub`'s four argv can't satisfy the record-write path (`symbolic-ref`, `show-toplevel`, `treeWork`, ident…). | unique-insight | high | verified in part (`recordWorld` calls `defaultBranch`, `treeFolder`, `sessionFactsOf`) | IA F5 | open named answers + trace |
| 7 | Per-commit gate `test:fast` skips the real-git tests that are phase 3's safety net, and `execute.md` forbids the full suite per commit. | unique-insight | high | verified (`skills/spec/execute.md:132`) | AT F1 | per-commit bar for phases 3–8 |
| 8 | Import scan can't see real git reached through production defaults or hard-wired `systemRunner`; a test passes on a fallback branch. | consensus | high | verified (`context/claims-here.ts:16`, `commands/phase/deployed.ts:15`) | IA F8, AT F2 | PATH tripwire in `test:fast` |
| 9 | Check 4 only looks inside `beforeEach`; repos built in test bodies (`git.test.ts`: 8 `repoWithOrigin`) pass. | unique-insight | high | verified (count) | AT F3 | flip check 4 |
| 10 | Read port and tracking-ref side effects aren't in any contract; the fake pair doesn't share tracking state. | consensus | high | verified (`commands/record.ts:51-53` reads tracking ref directly) | IA F6, AT F4 | read-port contract, linked pair |
| 11 | Check 5 is red on day one (`crew-deps.ts:4`; fixtures import `git-repo`). | consensus | medium | verified | PE F6, CQ F5, IA F7, AT F6 | shrinking exception set; fixtures allowed |
| 12 | `scanImports` returns paths only, so the `systemRunner` rule can't be checked; it also over-flags `run.test.ts`. | consensus | medium | verified (`run.test.ts` imports `systemRunner`; CQ probe) | CQ F4, IA F7, AT F2 | drop rule; tripwire covers it |
| 13 | Cap: `<=` doesn't track the list. | consensus | medium | verified (technical §1) | CQ F6, PE F5 | `===` |
| 14 | New lesson without `enforced-by` contradicts the house guard → `enforced-by` rule. | unique-insight | medium | verified (`lessons/recall.ts:12-14`) | PA F1 | fork → house rule |
| 15 | Guard file mixes ~74 data lines with scanning logic, near 250 lines. | unique-insight | medium | inferred | CQ F7 | split into `tests/real-git/` |
| 16 | Real contract runs need a defined reset between cases. | unique-insight | medium | inferred | CQ F8 | reuse `beforeAll` repo, delete refs per case |
| 17 | Import detection is string match, one level deep. | unique-insight | medium | inferred | AT F7 | `Bun.resolveSync` transitive closure |
| 18 | Guard and `test:fast` cover a different file set than bun collects (`root = "skills"`). | unique-insight | medium | verified (`bunfig.toml`) | AT F8 | enumerate bun's collection |
| 19 | Fake `land` and fake remote have no contract (`hasBranch` always true). | unique-insight | medium | read-in-code by AT | AT F9 | land contract; `hasBranch` cases |
| 20 | Coverage can be lost silently during migration. | unique-insight | medium | inferred | AT F10 | handoff test-name diff |
| 21 | `record sync`'s `refreshRecordCopy` (git archive) and `record status`'s `rev-parse` are outside the seam table. | unique-insight | medium | verified (`commands/record.ts:51-69`) | AT F11 | `mirror` seam / `trackingTip` |
| 22 | Shared `beforeAll` repos leak state; no reset helper. | unique-insight | medium | read-in-code by AT | AT F5 | `restore()` in phase 9 |
| 23 | One long PR vs neighbours editing the same files. | contradiction with Anton's call | medium | IA: overlap low | PE F4, AT F12 | keep one PR; rebase note |
| 24 | `@ast-grep/napi` vs `ROADMAP.md` "zero dependencies". | unique-insight | low | verified (`ROADMAP.md:19`) | IA F9, PA F5 | dev-only exception recorded |
| 25 | `readPlans` default port loses `fetchTimeoutMs`. | unique-insight | low | verified (`plan/read-plans.ts:34-35`) | CQ F9 | `read` in options, default keeps timeout |
| 26 | `gitStub` fallback typed `Runner` reopens split brain; belongs in `stub-runner.ts`. | consensus | low | verified (`tests/stub-runner.ts`) | CQ F10, PA F4 | `strictRunner` in `stub-runner.ts` |
| 27 | Rejected alternatives missing: TS compiler API, `bun test --changed`. | unique-insight | low | — | PA F5 | decision rows extended |
| 28 | `board-command` in no phase. | unique-insight | low | verified (wave 1 SMOKE-ONLY; absent from phases 4–9) | PE F1 | phase 4 |
| 29 | Edge case wrong: `gotcha-git-since…` path `crew-*.test.ts` still matches `crew-x.git.test.ts`. | consensus | low | verified (`*` spans dots in `Bun.Glob`) | IA F10, AT F12 | design.md corrected |
| 30 | `viewOf`'s default tip `t1` isn't covered by the hex-id decision. | unique-insight | low | verified (`tests/fake-record.ts:9`) | AT F13 | note: `viewOf` keeps `t1`; hash counter per fake instance |
| 31 | `gitRecordReadPort` rebuilds `gitRecordPort`, so origin is checked twice. | unique-insight | low | read-in-code by IA | IA F10 | `recordPortsOf` builds read from port |

## Rejected or unverified

- **Split phases 1–2 into their own PR first** (PE F4). Rejected: Anton's explicit one-PR call stands, and integration-architect found low overlap with the neighbours' open phases. A rebase note covers the rest.
- **Drop `REAL_GIT_CAP` entirely** (PE F5). Rejected in favour of `===` (CQ F6). Growth then needs a second, commented edit, which is cheap and visible.
- **`hooks/plan-changed.ts:60` and `page/serve.ts:20` hard-wired `systemRunner`** (AT F2). Not individually verified. They are covered by the tripwire, not by spec edits.
- **The beforeAll hook-timeout risk under load 289** (AT F5). Inferred. It is addressed by explicit timeouts, not measured.
