# Oversee One Spec — Design

## Problem

The whole-board overseer (`/spec oversee-crew`) runs one crew per clone, one worker per spec, and
one branch + PR to main per PR group. On 2026-11-17 an overseer finished most of CRM's 14-phase
`migration-reconciliation-rules` overnight only by working around that: it launched phases by hand
to keep other specs out, every PR group waited on its own merge to main, and the crew idled two
hours on a ship-mode question with a sound default. It then invented a spec branch in brief notes
(merge it in, verify, fast-forward push into it, retry); 19 pushes landed under real races. Along
the way: spec docs published per worker conflicted on main, close-out false-alarmed, and a worker
split itself onto new branches that duplicated 67 commits in a PR (#1295). Evidence:
`research/2026-11-17-wave-2-crm-run-naming-marker.md`.

## Who

Anton, running one overseer per spec he wants finished, several at once. The overseer and its
workers are Claude sessions: every rule they rely on is a tool line, not prose to remember.

## Decisions

Persona council (agent-harness engineer, context engineer, merge-queue engineer, Linus) consulted
2026-11-17 on decisions 1–8; picks below follow the majority or the stated reason.

| Decision | What we chose | Rejected alternative | Why |
|----------|---------------|----------------------|-----|
| Entry | `/spec oversee-crew <spec>`: the existing mode with a spec argument; spec-only behaviour in one section | A new `/spec oversee` sub-command (thin skill, wiring tests) | Same loop plus a filter; a second mode doc drifts from the first (3 of 4). The context engineer's worry, "if spec / else" prose everywhere, is met by one *One spec* section |
| Build order | `ready <spec> --order`: batches and longest chain, read-only | `crew plan <spec>`; regroup/split suggestions in the tool | A view of the graph `ready` already walks, useful to prep and review too. "Wave" already means a recon wave. Regroups and splits are the overseer's judgement through `phase set|split` (all 4) |
| Spec branch | `feat/<spec>`, the branch of group `default`; in spec-branch mode every code phase carries `pr:`, so `default` is free to mean the spec branch | Reserved group `feat/<spec>-pr-all`; per-phase branches; a new `pr-spec` claim kind | It already means "the branch carrying the spec" (`DEFAULT_PR_GROUP`); the final PR reuses group `default`'s claim, PR doc and babysit. `pr-spec` would parse as a group named "spec" (review 2026-11-17) |
| Spec-branch mode | An explicit record field `specBranch: { cutFrom, shipAlone }`, written with the `default` PR document in one `specBranchPlan` by `crew start --spec` (idempotent: a re-run is a takeover), removed by `prSyncPlan` when it records the final PR merged, whoever merged it; one pure `specLayout` + `branchOf` answers branch, base and ship-alone for every tool | Inferring the mode from `origin/feat/<spec>` existing | A stale or old `feat/<spec>` would flip the mode with no overseer, and nothing turned it off; ~14 sites would each make a git call (review 2026-11-17). Two single-field writes can land half; clearing only in `pr merge` misses a GitHub merge (review final-pr-and-mode-ends) |
| Who may use it | Specs joined to the board record only | Also `docs: main` / files specs, with a publish retry | Off the record a lane's tick reaches main only through a publish that can be refused, and the overseer relaunches finished work (review fork 1, applied unanswered — say if wrong) |
| Run file | `crew/run-<spec>.md` beside `run.md` | `crew/<spec>/run.md` | Briefs are already flat (`briefs/<spec>#…`); one `ls` shows every overseer |
| Overseer marker | One `specRun(spec)`: `run-<spec>.md` with state neither `stood-down` nor `finished` (the run ends `finished`); the notice also asks `whoseRun` for liveness | A `<spec>#overseer` claim; three separate liveness rules | A claim never reads done or gone (a dead overseer locks its spec forever) and a spec-less `/spec resume` in main would infer the overseer's spec from it (wave 2). `whoseRun` already follows a parked overseer. Covers this machine only, which is where crews run |
| Plan guard | A notice naming the overseer on plan-shape writes (`add`, `split`, `move`, `set`, `task`) by anyone but the overseer; in spec-branch mode the writer refuses only what breaks the layout (an ungrouped code phase, a ship-alone group needing another) | An ownership refusal; dropping the notice for the tick's diff | Ownership refusals become hard blocks when the overseer dies; layout invariants don't depend on it. The brief promises other sessions see the overseer (all 4; review final-pr-and-mode-ends) |
| Worker limit | 6 execute workers in state `working` or `blocked` across every repo on the machine, counted from the `claude agents --json --all` the tick already loads; relaunches exempt; a constant, no override yet | A key in the repo's `settings.md`; a counter file; a `local.md` override | A repo setting can't bound a machine; counting the roster can't drift; a per-clone override isn't machine-wide (review 2026-11-17) |
| Spec docs | Lane workers stop running `publish-docs`; with `docs: main`, `merge-back --push` calls `publishDocs` unchanged right after the lane lands on `feat/<spec>`; the snapshot reaches `feat/<spec>` through main at the next lane merge-back | Final PR carries the docs; per-worker publishing after merging the spec branch; pushing the snapshot merge onto `feat/<spec>` off-checkout | One publish code path; main already carries the snapshot, so a second push only moved the spec branch twice per landing and forced other lanes to regate (review final-pr-and-mode-ends) |
| Unplanned branches | `merge-back` and `pr open` refuse a head that is not the spec branch, a placed lane branch or a ship-alone group; one brief line | Worker-rule prose only | Prose already failed once (#1295) (all 4) |
| Side by side | A lane is a PR group with its own tree, cut from `feat/<spec>`. The overseer regroups phases into lanes and records file overlap as `same-files-as` | A structured per-phase files field; per-phase trees | "Files to touch" is unparseable prose in 75+ files; a field would rot. Git already checks a branch out once, so the group is the unit that runs at once |
| Merge-back | `merge-back <spec>` merges `origin/feat/<spec>` and `origin/<default>` into the lane; the worker runs the gates it names; `merge-back <spec> --push` lease-pushes as a fast-forward (a refusal says the spec branch moved, run it again) and publishes docs | Brief prose (the CRM recipe); one command that also runs the gate; an ancestor pre-check before the push | Prose worked 19 times; state an agent must never infer. Tools expand gates but never run them, so the gate stays the worker's step between two calls. The lease on the fetched tip is the race-free "moved" check; `leasePush` brings the house timeout, no prompt and `--no-verify` |
| Base branch | Derived: `specLayout` gives each group its base (spec branch for a lane, default for ship-alone or outside the mode); `pushBranch` takes `{ defaultBranch, base }` | Patch each "default branch" site; record the base in git config per tree | "Base = default branch" is hidden in ~8 places (Linus); a per-clone record goes missing on a reused or taken-over branch (review 2026-11-17) |
| Ship alone | A group listed in `specBranch.shipAlone` (set once at start, frozen once its branch exists) is cut from main, PRs to main, and reaches `feat/<spec>` only when a lane merges main; it may not `need` another group's phase. `ready --order` suggests groups that hold a `needs-deployed` target | Cutting it from the spec branch; merging its branch into the spec branch; deriving the list from `needs-deployed` on every read | A squash-merge otherwise brings the same change back twice; a derived class flips mid-run and a lane's PR to main would carry the whole spec (review 2026-11-17) |
| Main into the spec branch | Lanes merge main inside `merge-back`, gated by `after-merge-main` and resolved in their tree; once every lane is done, the final-PR babysitter merges main | The overseer's off-checkout `merge-back --main` at every heartbeat; babysitter only | An off-checkout push of main lands ungated code on every lane's base, and its conflicts had no owner since lanes only merged the spec branch. Lane merges keep drift small and give a `needs-deployed` phase the ship-alone code before it codes (review 2026-11-17) |
| Final PR | Group `default` (`feat/<spec>`), real everywhere through `branchOf`; the babysitter opens it from its own tree at the tick's `PR moment` line; on merge its state is copied onto every lane's PR document | A new final-PR concept | `default` already names `feat/<spec>` on the record; copying the merge keeps lane phases merged after the mode ends (review final-pr-and-mode-ends) |
| Cross-lane needs | A need on another lane's phase waits until that lane's worker closed out | Met on the tick, as today | The tick comes before `merge-back --push`; the dependent would code on a spec branch without it (review final-pr-and-mode-ends) |
| Final PR review | The spec's ship mode decides; a held PR's *How to review* lists each phase with its commits from the record | Always hold; review each phase as it lands | Anton's call (2026-11-17) |
| Ship mode with nothing set | `hold-for-review`: babysit to green and hold | Auto-merge unless the PR touches `deploy.paths` | Never idles, never merges to main without Anton's word; matches the house rule and CRM's settings (review fork 3, applied unanswered — say if wrong) |
| Rollout | Phase 1 and Phase 3 ship together in PR C; Phase 1 alone keeps one worker per spec, parallel lanes and the spec-branch cut come with Phase 3 | Phase 1 in its own PR A first | Phase 3's crew wiring sits on Phase 1's files, so two PRs would conflict or wait on a merge-main hop; parallel lanes before merge-back would republish the CRM docs conflict (Anton, 2026-11-17) |

## Flow

```
/spec oversee-crew <spec>            (main checkout)
  │ crew overseer --spec <spec>      another live overseer of <spec>? → stop
  │ ready <spec> --order             batches, longest chain, lanes
  │ regroup / split (phase set|split), pick ship-alone groups, Say if wrong
  │ crew start --spec <spec>         record-joined? open code phases have pr:? no old branches or default PR?
  │                                  record: specBranch + default PR doc · cuts feat/<spec> · crew/run-<spec>.md
  │                                  (mode already on → takeover: no checks)
  ▼
  tick ─► pick ready phases of <spec>, one per lane, ≤ caps, ≤ machine limit,
            a need on another lane only once that lane's worker closed out
            │ crew launch execute <spec> <phase>
            ▼
          worker in lane tree (branch feat/<spec>-pr-<g>, base feat/<spec>)
            │ merge-back <spec> before coding: feat/<spec> and main in, gates (execute §1)
            │ … TDD …
            │ handoff: [handoff] <spec> commit → merge-back <spec> → gates → merge-back <spec> --push
            │     (spec branch moved? merge-back again)     lease push · publish docs to main (docs: main)
            ▼
  tick ─► close-out: the phase's recorded commit is in feat/<spec>, Crew line found
  every code phase done ─► "PR moment: <spec> final PR" → babysit <spec> default (tree on feat/<spec>)
                           opens the PR, carries it in ship mode, merges main from here on
                           → merged (anywhere): lane PR docs merged, specBranch removed · run finished
  ship-alone group done ─► PR from feat/<spec>-pr-<g> to main → reaches feat/<spec> at the next lane merge-back
```

## Copy

Overseer start (one message):
```
Crew for migration-reconciliation-rules: 3 workers, 2 babysitters (settings) · machine 4 of 6 busy.
Order: 1 → [2 · 3a · 9] → [4] → [6 · 7 · 8 · 3] → 10   (longest: 2 → 4 → 6 → 10)
Lanes: A 2,4,5 · P 6 · M 7 · H 8 · L 3 · D 3a (ships alone) · J 9
Say if wrong: folded S into A (one lane, saves a merge on the longest chain)
Ship mode: auto (settings). Starting.
```

Tool lines (last stdout line). Merge-back is two calls, because the gate between them is the
worker's (tools never run gates):
- `merge-back x` → `Merged feat/x (+3) and main (+11) into feat/x-pr-b · run the after-merge-main and per-commit gates, commit, then merge-back x --push`
- `merge-back x` (nothing new) → `feat/x-pr-b already holds feat/x and main · merge-back x --push`
- `merge-back x` also prints the gates to run: `bun …/spec.ts gates --name per-commit` (and `after-merge-main`)
- `merge-back x --push` → `Merged back: feat/x-pr-b → feat/x (+4) · docs published to main`
- `merge-back x --push` (the spec branch moved) → `merge-back: feat/x moved; run merge-back x again`
- `merge-back: feat/x-pr-b conflicts with main in src/a.ts; resolve it here, commit, then merge-back x again`
- `merge-back: feat/x-ph-10b is not a lane of x; push your phase from your lane's tree`
- `crew start: x already has an overseer (2c555dd2 · x oversee-crew); message it`
- `crew start: x is not on the board; spec-branch mode needs the record (spec.ts join x)`
- `crew start: phases 11, 12 have no pr: group; give them one (phase set x 11 --pr <g>)`
- `crew start: feat/x-pr-a already exists (origin, local branch, tree); remove or merge it first`
- `crew start: x already shipped PR #1201 as one PR; put that work under its own group first`
- `Overseen: x (no live overseer, 3 workers)` · `Machine full: 6 of 6` · `PR moment: x final PR`
- `launch: 6 of 6 machine workers busy; nothing launched`
- `Notice: x is overseen by 2c555dd2; tell it about this change (SendMessage "x oversee-crew")`

## Edge cases

- **Overseer dies or is compacted:** the run file's `overseer:` is no longer live; a fresh `/spec
  oversee-crew <spec>` takes it over (`whoseRun`), and its `crew start --spec` skips the start checks. Workers keep
  running, and the whole-board crew still leaves the spec alone (`specRun`), saying so in one `Overseen:` line.
- **A spec finishes:** the run ends `finished`, so the whole-board crew can pick up phases added later.
- **Whole-board overseer meets a spec overseer:** its tick skips any spec in spec-branch mode or with a
  `specRun`, relaunches included; a spec overseer refuses to start while the whole-board run has any launched
  entry on that spec.
- **Merge-back race:** another lane pushed first → `--push` refuses with `feat/x moved`; the worker
  runs `merge-back` again (merge, gate, push). Nothing is lost: the lane branch is pushed first.
- **Merge conflict on merge-back** (with the spec branch or with main): refuse, name the files; the
  worker resolves in its tree.
- **Docs publish refused:** reported after the push line; the next `--push` from any lane publishes it.
  Ticks are on the record, so the overseer never sees finished work as open.
- **A worker splits its phase mid-run:** its `phase split|set|add` notices the overseer, and the writer refuses
  an ungrouped code phase. A new group lands on the record (the base), so it becomes a real lane; `merge-back` and
  `pr open` still refuse a branch that isn't one.
- **A lane ticks its last task, then its merge-back fails:** phases that need it wait; the lane's worker hasn't
  closed out until its commit is on `feat/<spec>`.
- **Plan regroup made on a branch:** placement reads `pr:` from base
  (`gotcha-trees-place-reads-pr-group-from-base`); the overseer's regroups go through `phase set`,
  which lands where the spec lives (record or main) before any launch.
- **A spec with no PR groups:** not spec-branch mode; one worker at a time, today's handoff and PR.
- **Ship-alone group needs a deploy before another lane:** `needs-deployed` as today; the dependent
  phase's worker merges main in its first `merge-back`, so it builds on the deployed code.
- **Final PR closed or changes requested:** the final-PR babysitter fixes review comments in its tree on
  `feat/<spec>`; a closed PR keeps the mode (a reopen still works) and is a question for Anton.
- **Final PR merged on GitHub:** the next `pr status` or board load records it, and the same write marks every lane
  document merged and ends the mode.
