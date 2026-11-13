# PR Opening — Live Board

## Spec state

Spec written 2026-11-11 from prep (wave 1, wave 2, craft) and re-planned by the review of the same day
(`reviews/2026-11-11-write-contract-and-switch-day.md`). 12 code phases and 2 task phases. PR split:
**A:** phase 1 · **B:** phases 2, 2a, 3, 3a, 3b, 4 · **C:** phase 6 · **D:** phase 7 · **E:** phase 8 · **F:** phase 9 ·
**G:** phase 10. Phases 5 and 11 are tasks in the CRM repo and open no plugin PR.
One minor version per PR, picked at merge (main's minor + 1). PR B ships with `board.record` off. PRs C, D
and E each raise the record's layout number and carry the upgrade step for specs that joined earlier.
PR #37 merged 2026-11-11 as 9392c3f (squash).
PR #38 merged 2026-11-12 as 0aaa216 (squash).
PR #39 merged 2026-11-13 as e21190b (squash).

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin PRs open ready, not draft — never straight to `main`.

- [x] `bun test` passes (incl. `skill-wiring.test.ts`, `commands-table.test.ts`, `board-no-focus-golden.test.ts`)
  PR A, 2026-11-11 (load average 289): `1561 pass · 1 fail` — `codex-packaged-entry.test.ts` "source fixture
  completes … fresh-process pickup" timed out at 5906 ms against the 5 s default; alone with `--timeout 30000`:
  `4 pass · 0 fail`, as at the branch base (`docs/specs/_ledger/gotcha-codex-packaged-entry-test-runs-near-its-timeout.md`).
  PR B, 2026-11-12: `1805 pass · 0 fail`; typecheck clean; `bun install --frozen-lockfile` no changes.
  PR C, 2026-11-13: `1901 pass · 0 fail` across 269 files (272 s) before the newer-layout fix; then the
  write-command suites (`410 pass · 0 fail`) and the new `record-newer-layout.test.ts`; typecheck clean;
  `bun install --frozen-lockfile` no changes.
- [x] `bun run typecheck` clean (PR A, 2026-11-11)
- [x] `bun install --frozen-lockfile` clean (no new runtime dependencies) (PR A, 2026-11-11)
- [x] `python3 scripts/version.py --set <main's minor + 1>` at merge; all declarations match; ROADMAP row added (PR B: 2.53.0, `All version declarations match: 2.53.0`, row under *Live board (2.53)*; PR C: 2.54.0, `All version declarations match: 2.54.0`)
- [x] New and touched tool files under 250 lines, functions under 50 (PR A: largest `record/outbox.ts`, 143; PR C: largest `board/model.ts`, 227)
- [x] `bun skills/spec/tools/spec.ts doctor live-board` has no errors (PR A: `doctor: clean`; PR C: `doctor: clean (1 spec)`)
- [x] With the board off, a file-based spec behaves as before: the pre-existing suites pass unchanged
  PR A: nothing reads the record yet; the same one timing failure as `bun test` above.
  PR B, 2026-11-12: full suite green; the only edited expectation is the frozen-plan hook naming `phase task`.
- [x] From a scratch repo with two clones (two "machines"), with this branch's tools: the PR's own scenario
  runs end to end and its output is pasted here (PR A: three writers race; PR B: a spec joins, two trees tick
  tasks of the same phase and of different phases, each sees the other's on its next command, and
  `record export` gives the lists back; PR C, D, E: a spec joined on the previous release is upgraded on its
  next touch and the previous release refuses to write)
  PR A, 2026-11-11, bare origin + three clones, `tests/fixtures/record-writer.ts` started at one instant:
  ```
  $ laptop: record sync (before any write)
  record: no record on origin yet · nothing queued
  $ three machines add an entry to one list at the same moment
  desktop: landed
  laptop: landed
  third: landed
  $ desktop: record sync
  record: synced a17cec6 · local copy refreshed · nothing queued
  $ desktop: record status
  record: tip a17cec6 · local copy from <1m ago · nothing queued
  $ desktop: the list in the local copy
  {"items":["desktop","laptop","third"]}
  $ origin: refs
  refs/heads/main
  refs/spec-board/record
  ```
  PR B, 2026-11-12, bare origin + clones `laptop` and `desktop`, `board.record: on`, `docs: main`, this
  branch's `spec.ts` (script: the session scratchpad's `pr-b-scenario.sh`; the context pack trimmed to its table):
  ```
  $ laptop: spec.ts join demo
  join: demo is on the board (2 phases, 3 tasks, 0 worktrees read) · banner landed on main (fae4224)
  $ laptop: spec.ts phase tick demo 1 1.1
  tick: phase 1 · 1.1 done (b86f6e7 on origin/feat/demo-pr-a)
  $ desktop: spec.ts phase tick demo 1 1.2
  tick: phase 1 · 1.2 done (424853e on origin/feat/demo-pr-b)
  Phase 1 complete — run update.md → Close the phase
  $ desktop: spec.ts phase tick demo 2 2.1
  tick: phase 2 · 2.1 done (424853e on origin/feat/demo-pr-b)
  Phase 2 complete — run update.md → Close the phase
  --- laptop's next command sees desktop's ticks
  $ laptop: spec.ts ready demo
  Ready now: none

  PR A: phases 1 ✓
  PR B: phases 2 ✓
  $ laptop: spec.ts phase task demo 2 --add write log
  task: phase 2 · added 2.2 (plan v2)
  --- desktop sees the task laptop added
  $ desktop: spec.ts context status demo
  Board: live · plan v2
  | Phase | Status | Delivers | Work |
  | 1 — Read | ✅ done | reads work | 1.1 parse input — b86f6e73772974f1dd678fe42be38cf847220512 on origin/feat/demo-pr-a; 1.2 read cache… |
  | 2 — Write | 🟡 WIP (1/2) | writes work | 2.1 write file — 424853edbd301a0aa7309c38de02c76d3afcf8cb on origin/feat/demo-pr-b; 2.2 write log |
  --- the way back
  $ laptop: spec.ts record export demo --unjoin
  export: demo written to files (2 phases, 4 tasks); off the board. Commit and publish these files: every tree reads them from now on
  $ laptop: progress.md and phase 1 after export
  # Demo — Progress

  ## Phases

  - [x] Phase 1 — Read → `phases/phase-1-read.md`
  - [ ] Phase 2 — Write → `phases/phase-2-write.md`
  ---
  needs: []
  pr: A
  ---
  # Phase 1 — Read

  **Outcome:** reads work.

  ## Deliverables

  - [x] parse input — b86f6e73772974f1dd678fe42be38cf847220512 on origin/feat/demo-pr-a
  - [x] read cache — 424853edbd301a0aa7309c38de02c76d3afcf8cb on origin/feat/demo-pr-b
  $ laptop: spec.ts ready demo
  Ready now: 2 Write (in progress)

  PR A: phases 1 ✓
  PR B: phases 2
  ```
  PR C, 2026-11-13, bare origin + clones `laptop` (released 2.53.0) and `desktop` (this branch), script
  `pr-c-scenario.sh` in the session scratchpad. The upgrade works; **2.53.0 does not refuse**: it reads the
  layout-2 record as no record and writes its files (`ledger/gotcha-2-53-writes-files-on-a-newer-record.md`).
  Fixed forward (2.54 refuses a newer layout, `tests/record-newer-layout.test.ts`); for 2.53 → 2.54 every
  install must update before the first 2.54 write in CRM.
  ```
  $ laptop: spec.ts (2.53.0) join demo
  join: demo is on the board (2 phases, 2 tasks, 0 worktrees read) · banner landed on main (e95b144)
  --- record after the 2.53.0 join
  meta.json: { "layout": 1 }
  $ desktop: spec.ts (this branch) phase set demo 2 --title Writes
  set: phase 2 · title "Writes" (plan v2)
  --- record after this branch's first write
  meta.json: { "layout": 2 }
  spec.json: {…,"layout":2,"status":"active","owner":"Taras","ship":"auto"}
  prs/A.json: {"group":"A","branch":"feat/demo-pr-a","state":"merged","number":5,"mergedAt":"2026-11-10","mergedSha":"abc1234","method":"squash"}
  prs/B.json: {"group":"B","branch":"feat/demo-pr-b","state":"not-opened"}
  record: set demo (plan v2)
  record: upgrade demo to layout 2
  record: join demo
  $ laptop: spec.ts (2.53.0) phase set demo 2 --title Again
  set: phase 2 · title "Again"            ← a file write: 2.53.0 should have refused
  $ desktop: spec.ts (this branch) owner demo Anton
  owner: demo is Anton (351768e)          ← on the record; main still has 2 commits
  ```
- [x] The claims suites pass unchanged after `core/remote-push.ts` is lifted out (PR A: no diff in `tests/claims-*.ts`, 93 pass)
