---
date: 2026-11-17
spec-phase-at-review: none started (phases 1, 2, 3 ready)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: spec-branch-lifecycle
---

# Review — spec-branch-lifecycle

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

All five reviewers returned **fix-then-proceed**, and so does this synthesis. The spine is right: per-spec run files
read with `whoseRun`, a parameterised tick instead of a fork, one spec branch fed by a two-call merge-back that the
CRM night proved under real races, and a read-only build-order view. Every code citation in technical.md checked out.

What's wrong clusters in one place: **the spec branch has no explicit lifecycle.** Spec-branch mode is guessed from
whether `origin/feat/<spec>` exists. That name already belongs to ungrouped phases, so a stale branch can flip the mode
on, and nothing turns it off. Ship-alone is defined two ways and can change class mid-run. A tree's base lives in
per-clone git config. Main reaches the spec branch through an ungated off-checkout push whose conflicts nobody owns.
Docs publishing is a fourth publish path with an unguarded second push. And Phase 1 (PR A) turns on parallel lanes
before Phase 3 (PR C) makes them safe, while also cutting the branch that later flips the mode.

The fix is to make the lifecycle explicit and derive everything else from the plan:
- a spec field marks the mode, and one pure `specLayout` answers every "which branch, which base, ships alone?" question;
- a frozen `ship-alone:` list;
- lanes merge main themselves through the gated merge-back;
- docs publish through `publishDocs` unchanged;
- the mode is refused unless the spec is joined to the board record.

## Forks put to the user

The question went out at 14:43 and got no answer in 5 minutes, so the synthesizer applied its recommendation on each.
They are recorded as decision entries marked "unanswered — say if wrong"; overruling any of them is a `phase set|task`
change plus an edit to the decision entry.

1. **Spec-branch mode only for specs on the board record?**
   - Record only: CRM qualifies; this repo (board off, docs on branch) doesn't.
   - Also support `docs: main` / files specs: needs a publish retry and a tick that reads `feat/<spec>`.
   - → **Record only** (`decision-spec-branch-needs-the-record`). With the record, ticks are instant and the
     relaunch-finished-work and stall failures (adversarial F1, integration F9) can't happen.
2. **PR A scope.**
   - Move parallel lanes and the `feat/<spec>` cut to Phase 3.
   - Or ship A and C together.
   - → **Move them to Phase 3** (`decision-lanes-ship-with-the-spec-branch`). Phase 1's Outcome is reworded.
3. **Final PR ship default with no `ship:` / `pr.ship`.**
   - Hold for review.
   - Or auto-merge unless `deploy.paths`.
   - → **Hold for review** (`decision-final-pr-holds-by-default`). It never idles and never merges to main
     unasked, which keeps the house rule that opening and merging are asked unless `ship:` / `pr.ship` answers.

## Resolved by the synthesizer

- **Mode marker:** `spec-branch: on` in the spec's fields (record field for joined specs), written by `crew start --spec`
  through the path `ship`/`owner` use, cleared when the spec-branch PR merges or closes. `specBranchMode` reads it; no git
  lookup (PE F1, CQ F1/F2, IA F2, PA F5, AT F8).
- **One pure seam:** `specLayout(state, meta)` in `T/pr/groups.ts` returns each group's branch, base and ship-alone
  flag plus the final PR's head. Commands load the facts once and pass the layout down; pure callers take the layout,
  never `git` (CQ F1).
- **Base derived, no git config:** `baseOf` = `specLayout(...).groups.get(g).base`. Drops `branch.<b>.specBase`
  (CQ F3, PA F2, IA F12, AT F9). The tree-cut record AT F10 wanted is replaced by the frozen ship-alone list and the
  "every code phase has `pr:`" rule.
- **Ship-alone explicit and frozen:** `ship-alone: [D]` beside `spec-branch: on`, set once by the overseer at start.
  `ready --order` *suggests* groups whose phases are `needs-deployed` targets. A group can't join or leave the list once
  its branch exists. A ship-alone group may not `need` a phase of another group; refused at `crew start --spec`
  (PE F2, PA F6, IA F3, AT F4). This keeps design.md's original decision; technical.md had drifted from it.
- **Main into the spec branch:** drop `merge-back --main`. A lane's `merge-back` merges `origin/feat/<spec>` and then
  `origin/<default>`; the worker runs the `after-merge-main` and per-commit gates before `--push`. Main arrives gated, a
  conflict is resolved in the lane's tree, and a `needs-deployed` dependent gets the ship-alone code before it codes
  (PA F1, PE F3, AT F2, AT F5). Once every lane is done, the final-PR babysitter is the only writer that merges main
  (IA F11).
- **Docs:** `--push` calls `publishDocs` unchanged in the lane after its fast-forward push. If the follow-up push of
  the snapshot merge finds `feat/<spec>` moved, it merges the docs-only snapshot onto the new tip off-checkout (two
  attempts, as `publishDocs` retries), never a one-shot fast-forward (CQ F8, PA F3, IA F6, AT F3). A refused publish is
  retried by the next `--push`, which publishes whenever there is something to publish.
- **Push race:** no ancestor pre-check; push, and map a non-fast-forward rejection to `feat/<spec> moved; run
  merge-back <spec> again` (PA F8, AT F12).
- **Every code phase carries `pr:` in spec-branch mode.** `crew start --spec` and `ready --order` name the ungrouped
  ones. That frees group `default` (already `feat/<spec>`, `DEFAULT_PR_GROUP`) to mean the spec branch: the final PR
  is group `default`, claim `pr-default`, its PR document is `default`, and `launch babysit <spec> default`. No
  `pr-spec` kind (PA F4, IA F4, IA F8, AT F7, CQ F2).
- **Specs with no groups:** not spec-branch mode; one worker, today's handoff. design.md's edge case is corrected (AT F15).
- **Old branches:** `crew start --spec` refuses while `feat/<spec>` or any `feat/<spec>-pr-*` already exists on origin,
  and names them (AT F8, AT F9, IA F2).
- **Board record:** `joinedActivity` / unopened-PR rows skip lane groups in spec-branch mode and read the `default`
  PR doc instead. Lands in Phase 3 (IA F5).
- **Whole-board crew:** skips every spec with `spec-branch: on` or a `run-<spec>.md` whose state isn't `stood-down`,
  not only a live overseer. `crew start --spec` refuses only on board workers that are still alive (IA F10, AT F11).
- **Plan-write notice:** computed in `T/commands/phase/context.ts`, not inside `T/plan/` (PE F4). Exempts only the
  overseer: launched workers' plan-shape writes (`add`, `split`, `move`, `set`) are noticed too, so a worker splitting
  itself (#1295) reaches the overseer (AT F10). `crew tick --spec` also prints `noticePlanChange` for its spec
  (reader side, PA F7).
- **Machine limit:** constant 6, no `local.md` override (YAGNI; per-clone isn't machine-wide, PE F5, PA F9). Counts
  execute workers in state `working` or `blocked` only; a `done` worker waiting for close-out doesn't hold a slot
  (AT F13). The refusal is enforced once, in `launchCrewSession` (CQ F6).
- **Tick structure:** pure `T/crew/scope.ts` `scopeWorld`; `overseen()` and `machineCount()` ports on `TickPorts`;
  `fillSlots` inputs folded into one object; one `groupKey(spec, group)` used by both `pickRows` and the tick's
  `busy` (CQ F6, F7).
- **Run file from the positional spec:** `crew launch|check execute <spec> …` use `run-<spec>.md` when it exists with a
  live overseer, so a forgotten `--spec` can't misfile a worker (AT F16).
- **Handoff identity:** `[handoff] <spec> phase <id>: …` subject (handoff.md, Phase 4). Close-out's handoff check
  counts only commits reachable from `origin/<lane>` that are also on `feat/<spec>`. *How to review* greps that subject
  (IA F7).
- **Close-out "pushed":** lane HEAD is contained in `origin/feat/<spec>`, not "HEAD == origin/<lane>". The docs
  snapshot merge moves the lane past its own pushed name, which would otherwise false-alarm every lane (synthesizer's
  own finding, below).
- **buildOrder:** detects cycles (`Cycle: 4 → 6 → 4`) and lists unknown refs under Waiting; the later phase of a
  `same-files-as` pair goes in the next batch (AT F14, IA F14).
- **Merge-back module:** with `--main` gone, one `publish/merge-back.ts` (lane merge + `--push`) with its union and
  render; `merge-commit.ts` extraction is still needed for the snapshot-onto-tip merge (CQ F5, CQ F9/AT F17).
- **Naming:** code identifiers say `group`, prose and output say "lane" (CQ F10).
- **Tests:** `publish-merge-back.test.ts`. The real-git case list: clean, already holds, main merged in, conflict left
  in progress, moved on push, snapshot push after a move, docs refusal after push. A pure `specLayout` test (mixed
  spec, ship-alone freeze). `related: fast-tests`; build the fast `CrewDeps` builder only if fast-tests phase 8 hasn't
  landed (CQ F11, IA F13).
- **Final-PR review changes:** the final-PR babysitter fixes review comments in its own tree on `feat/<spec>`; there is
  no group's last phase to relaunch (IA F11).

## Findings

Signal: C = consensus, U = unique-insight, S = superseded. V = verified by the synthesizer in code, I = inferred / not
re-checked.

| # | Finding | Sev | Signal | Personas | Ver | Applied as |
|---|---|---|---|---|---|---|
| 1 | Spec-branch mode guessed from `origin/feat/<spec>` existing; no lifecycle; stale branch flips it | high | C | PE1 CQ2 IA2 PA5 AT8 | V (`naming.ts:7-10`, `pr-doc.ts:11-12`) | explicit `spec-branch:` field + `specLayout` |
| 2 | Phase 1 enables parallel lanes and cuts `feat/<spec>` before Phase 3 exists | high | C | PE1 CQ4 IA1 AT6 | V (`pick.ts:22-23`) | fork 2; group key and cut moved to Phase 3 |
| 3 | Ship-alone defined two ways; class can flip mid-run; can `need` lane-only work | high | C | PE2 PA6 IA3 AT4 | V (design.md:39 vs technical.md:12-14; `ready-set.ts:46`) | explicit frozen list; needs refusal |
| 4 | `--main` ungated, off-checkout code merge; its conflict has no owner | high | C | PA1 PE3 AT2 | V (`execute.md` after-merge-main; technical.md:92-94) | lanes merge main in merge-back |
| 5 | needs-deployed dependent launched before main is in the spec branch | high | U | AT5 | V (`ready-set.ts:47`) | superseded by 4 (lane merges main before coding) |
| 6 | Ungrouped code phase in a grouped spec lands on `feat/<spec>` itself | high | C | synth CQ2 IA8 AT7 | V (`naming.ts:7-10`, `pr-doc.ts:50-56`) | every code phase needs `pr:` |
| 7 | `pr-spec` claim parses as group "spec"; group `default` already means `feat/<spec>` | high | C | PA4 IA4 | V (`pr-claim.ts:3`, `pr-doc.ts:11-12`) | use group `default` |
| 8 | Board record: finished lanes show "built, PR not opened" forever | high | U | IA5 | V (`joined-activity.ts:33-35`, `missingPrDocs` callers) | Phase 3 read-site fix |
| 9 | Refused docs publish → phase reads open on main → relaunched; docs: branch stalls | high | C | AT1 IA9 | V (`pick.ts:30` readyIn) | fork 1 (record only) |
| 10 | Snapshot push to `feat/<spec>` races; criss-cross bases return | high | C | AT3 IA6 | V (`publish.ts:55-61`, `snapshot.ts:57-64`) | off-checkout snapshot merge onto tip, retry |
| 11 | Docs publish re-sequenced as a 4th publish path | med | C | CQ8 PA3 | V | call `publishDocs` unchanged |
| 12 | `baseOf` via per-clone git config; missing on reuse/takeover | med | C | CQ3 PA2 IA12 AT9 | V (`acquire.ts:18-22`; no `config` calls in tools) | derived from `specLayout` |
| 13 | Mode check scattered over ~14 sites, several pure | high | U | CQ1 | V (`claims/rules.ts:48`, `prune-rules.ts:24`) | one pure `specLayout` |
| 14 | Close-out "pushed" false-alarms after the docs snapshot merge | med | U | synthesizer | V (`close-out-run.ts:70-75`) | pushed = contained in `feat/<spec>` |
| 15 | Handoff check counts any lane's `[handoff]`; grep string never written | med | U | IA7 | V (`handoff.md:133`) | phase id in subject; lane-reachable check |
| 16 | Whole-board crew re-takes a spec when its overseer dies | med | C | IA10 AT11 | I | skip on field / non-stood-down run |
| 17 | Final PR review-changes relaunch target; two writers of main | med | U | IA11 | V (`oversee-crew.md` pr-changes) | babysitter fixes; sole main writer at the end |
| 18 | Plan writer would import crew layer | med | U | PE4 | V (`phase-writer.ts:55-61`) | notice in `commands/phase/context.ts` |
| 19 | Lane check trusts a plan a worker can edit (#1295 again) | med | U | AT10 | I | workers' plan-shape writes noticed to overseer |
| 20 | `--push` pre-check races; raw rejection line | med | C | AT12 PA8 | V (`publish.ts:18` NON_FAST_FORWARD) | map rejection to "moved" |
| 21 | Machine limit counts `done` workers | med | U | AT13 | V (`agents.ts:7`) | count working/blocked |
| 22 | `tick.ts` growth; untestable skip/limit | med | U | CQ6 | V (`tick.ts:117` 7 params) | scope.ts + ports |
| 23 | Two key builders for pick and busy will drift | med | U | CQ7 | V (`tick.ts:124`) | one `groupKey` |
| 24 | `merge-back.ts` over 250 lines | med | U | CQ5 | I | S by 4 (`--main` gone) |
| 25 | buildOrder: cycles / unknown refs undefined | med | U | AT14 | I | Cycle line, Waiting |
| 26 | Machine override per clone isn't machine-wide | low | C | PE5 PA9 | V (`local-settings.ts:21`) | constant 6 |
| 27 | merge-back has three callers/mechanisms | low | U | PE6 | — | S by 4 |
| 28 | `landOnRef` can't build a merge commit | low | C | CQ9 AT17 | V (`land-on-ref.ts:17-21`) | bounded 2-attempt loop |
| 29 | "Lane" collides with board lanes | low | U | CQ10 | V | code says `group` |
| 30 | Test plan gaps; fast-tests overlap | low | C | CQ11 IA13 | V (fast-tests phase 8) | test list; `related: fast-tests` |
| 31 | `ready --order` batches a same-files pair together | low | U | IA14 | V (`ready-set.ts:67-74`) | later one next batch |
| 32 | design vs technical on no-group specs | low | U | AT15 | V | technical wins |
| 33 | `crew launch --spec` can disagree with positional spec | low | U | AT16 | I | run file from positional spec |
| 34 | Reader-side plan-change notice exists | low | U | PA7 | V (`plan-version.ts`) | tick line added |
| 35 | Rewritten spec branch not detected | low | U | AT18 | I | review-file only |
| 36 | Ship-mode default auto-merges CRM PRs against its recorded ruling | med | U | synthesizer | V (CRM settings.md: no `pr.ship`, question asked per PR) | fork 3 |

## Rejected or unverified

- **AT18 (rewritten spec branch):** inferred and unlikely; nothing in the house rebases. Not applied; revisit if Phase 7
  hits it.
- **AT10's "identify lanes by a placement record":** rejected in favour of a derived base plus the frozen ship-alone list.
  A per-clone record is the same drift CQ3 rejects. The #1295 path is covered by "never create branches" in the
  brief, `merge-back` refusing branches that aren't groups at base, and the overseer hearing about workers' plan-shape writes.
- **PE6's separate `sync-spec` command:** moot once `--main` is gone.
- **IA's "push lane + snapshot in one fast-forward, then publish":** rejected. A snapshot on the branch but not on
  main makes `snapshotBase` pick it as the base, so the next publish skips unpublished changes (`snapshot.ts:60-63`).
