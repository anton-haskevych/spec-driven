---
date: 2026-11-17
spec-phase-at-review: none started (phases 1 and 2 ready)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: final-pr-and-mode-ends
---

# Review — final-pr-and-mode-ends

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

Second review of the day, on the spec as rewritten by `2026-11-17-spec-branch-lifecycle.md`. That review's
decisions are settled context; nobody challenged them, and the principal engineer checked the three applied
without an answer and found they hold.

## Summary

All five reviewers returned **fix-then-proceed**; so does this synthesis. The parts in the middle hold: the merge-back
core, per-spec run files, `scopeWorld`, `machineWorkers` on `loadAgents`, and one pure `specLayout`. Every file:line
citation the integration architect checked still matches the code.

What breaks clusters at the spec's two edges:

1. **The final PR as group `default` works only in `pr-doc.ts`.** Everywhere else, `default` means "no group" or a
   group literally named "default": `pickGroup` refuses it, `wholeGroup` finds no phase, `treeName` makes
   `feat/<spec>-pr-default`, the babysit pack stops, `takeRefusal` refuses `pr-default`, babysit placement is
   existing-only, and `createPr` needs a tree on the head. Because every code phase carries `pr:`, no `default` PR
   document is ever created, so `prSyncPlan` refuses the final PR ("matches no PR group").
2. **The mode's start and end aren't real lifecycle events.**
   - *Start:* two single-field record writes, neither of which can hold a list, done after a branch push, with
     refusal checks outside the record write. On takeover the overseer re-runs `crew start`, which refuses on its
     own spec branch.
   - *End:* happens only in `pr merge`. With hold-for-review as the default, Anton usually merges on GitHub, and
     the mode stays on for good. Even a `pr merge` end turns every lane phase back into "built, PR not opened",
     because the redirect to the `default` document is tied to the field that just cleared.
   - The run file has no end state either, so the whole-board crew skips a finished spec forever, without a word.

Third: a phase reads done on the record at its last tick, before `merge-back --push` lands its code on
`feat/<spec>`. Once Phase 3 makes the busy key per group, a dependent lane can launch onto a spec branch without
the code it needs.

The fix keeps the shape and moves facts to where the record is written:
- `crew start --spec` turns the mode on in one record plan that also creates the `default` PR document, and is
  idempotent for takeover.
- Every group-to-branch lookup goes through `specLayout`.
- `prSyncPlan` ends the mode, which every merge path already goes through, and copies the final PR onto the lane
  documents.
- The run file gets a `finished` state, and every caller asks one `specRun` resolver.
- A need on another lane waits until that lane's worker closes out.

## Forks put to the user

None. Every finding has a sound answer that stays inside this spec, can be undone, and keeps every phase's
Outcome. No graduation candidates (`lessons candidates`: none). The three decisions from the first review that
were applied without an answer stay as they are; no reviewer challenged them with evidence.

## Resolved by the synthesizer

- **Keep group `default` as the final PR**, and route every group-to-branch lookup through one `specLayout`-backed
  `branchOf(layout, group)`. Rejected: a new final-PR concept, which brings back the parse problems the first
  review avoided.
- **The mode turns on in one `specBranchPlan` record write.** It sets `specBranch: { cutFrom, shipAlone }` on the
  spec document and creates the `default` PR document (`not-opened`, branch `feat/<spec>`). It checks the
  invariants at the tip and is never queued. Then comes the create-only cut of `cutFrom`. A re-run with the mode
  already on skips the checks and cuts only if the branch is missing, which is how takeover works. These are crew
  state, not user fields: not added to `SPEC_FIELD_KEYS`.
- **The mode ends in `prSyncPlan`.** When the `default` document turns `merged`, the same write copies number,
  state and merge onto every lane group's document and removes `specBranch`. A closed final PR keeps the mode on
  and becomes a *Needs you* row (design.md said "clears"; that would strand the branches and refuse a reopen).
  Stage, activity, cards and prune then read each lane's own document, mode on or off. The Phase 3 `joinedActivity`
  redirect shrinks to "lanes never get the unopened-PR row while the mode is on".
- **One overseer rule:** `specRun(spec)` is `run-<spec>.md` with state neither `stood-down` nor `finished`. Launch,
  check, the whole-board skip and the notice all read it. The notice also asks whether the overseer is live. `crew
  check <id>` searches every run file. `crew tick --spec` writes `state: finished` when the spec has no open phase and
  no launched session. The whole-board tick also filters its relaunches through the skip, and prints one `Overseen:
  <spec> (no live overseer, N workers)` line when the overseer is gone.
- **Phase 1 skips on the run file only.** The `specBranch` half of the skip and every field reader move to the phases
  that write them (2 reads, 3 writes). The record is the only source: no `spec-branch:` in `CLAUDE.md`.
- **Cross-lane needs:** in the mode, `pickRows` holds a row while a needed phase's lane has a launched worker that
  hasn't closed out. Close-out proves the merge-back, so the dependent's first `merge-back` holds the code it needs.
- **Plan invariants are refusals, not notices.** In the mode the phase writer refuses an ungrouped code phase and a
  ship-alone group needing another group's phase. These are invariants of `specLayout`, not an ownership lock, so the
  "refusals become hard blocks when the overseer dies" reason doesn't apply.
- **Plan-write notice:** kept, since the brief promises it. The overseer is silent, and every other writer gets it on
  plan-shape actions only (`add|split|move|set|task`). There is no launched-worker test: a short id can't be matched
  cheaply. The notice is appended to `notice`, never assigned.
- **Drop step 4 of `--push`.** `publishDocs` lands the snapshot on main, and every lane's next `merge-back` brings main
  in. So the snapshot reaches `feat/<spec>` gated, with no off-checkout merge and no second move of the spec branch
  per push. That also halves the "moved" reruns (AT F10). The `mergeCommit` extraction leaves this spec.
  Docs publish only when settings say `docs: main`.
- **`--push` uses `leasePush`** (`core/remote-push.ts`: timeout, no prompt, `--no-verify`), with the expected value
  set to the `origin/feat/<spec>` tip it just fetched. Before pushing it refuses unless HEAD contains that tip: a lease
  is a forced push, and this guard keeps it a fast-forward.
- **Close-out and *How to review* read the record, not a commit subject.** A phase is merged back when its last
  task's evidence sha (`<sha> on origin/<lane>`) is in `origin/feat/<spec>`. Its commits are its tasks' evidence shas.
  The Crew line comes from the last turn, else the newest `[handoff] <spec>` commit body on `origin/<lane>`. The
  `[handoff] <spec> phase <id>` subject change drops.
- **Machine limit:** no new port. The tick already loads `claude agents --all`, so `FillContext` carries the count,
  and `CrewLaunchRequest.machineBusy` lets the refusal stay in `launchCrewSession` without a fifth parameter.
  Relaunches are exempt, because they reuse the slot the closed-out worker freed. The "overshoot by one" claim is
  corrected: two overseers ticking together can each fill to the limit. A tick that the limit blocks prints one
  `Machine full: 6 of 6` line.
- **PR moment in the mode:** a lane's `PR group ready` starts nothing. The tick prints `PR moment: <spec> final PR` once
  every code phase outside the ship-alone groups is done. The babysitter opens the PR from its tree on `feat/<spec>`,
  which babysit placement may cut or take over.
- **Start checks count open code phases only.** A `default` PR document that already has a number refuses the mode.
  Check 4 also covers local branches and trees.
- **Smaller structure calls:**
  - `systemTickPorts` moves to `tick-ports.ts` first.
  - `crew/spec-branch-start.ts` gets a pure refusal plus the cut.
  - `shipAloneSuggestions(state, nodes)` lives in `ready/build-order.ts`.
  - Cycles come from `needsCycle`.
  - Unknown refs are read through `resolvePhaseRef`.
  - `needs-deployed` counts as met only when deployed.
  - `TickWorld.layouts` is built once.
  - `pushBranch`'s `base` is optional.
  - The close-out tests use `sequencedRunner`, not real git.
  - `merge-back` prints `spec.ts gates --name` lines.
  - A conflict line says "then `merge-back <spec>` again".
  - The `claimKey` work is a test only.

## Findings

Signal: C = consensus, U = unique-insight. Verified = V (I read the code), I = inferred and judged sound.
Personas: PE principal, IA integration, AT adversarial, CQ code quality, PA prior art.

| # | Finding | Sev | Signal | Raised by | Check | Applied as |
|---|---------|-----|--------|-----------|-------|-----------|
| 1 | Group `default` is only real in `pr-doc.ts`. `pickGroup`, `wholeGroup`, `treeName`, the babysit pack, `takeRefusal`, babysit `existingOnly` and `createPr` all fail for the final PR | critical | C | IA1 PA2 AT1 | V (`naming.ts:7-9`, `place.ts:98-100`, `rules.ts:52`, `groups.ts:23`) | `branchOf` via `specLayout`; babysit may cut the final-PR tree; the babysitter opens the PR |
| 2 | No `default` PR document is created, so the final PR's sync is refused | high | C | PE1 IA2 AT1 | V (`pr-doc.ts:63-66`, `pr-sync.ts:73-74`) | `specBranchPlan` creates it |
| 3 | The mode clears only in `pr merge`; a GitHub merge never clears it | high | C | PE3 PA1 AT12 | V (`board/pr-sync.ts` writes docs only) | Cleared in `prSyncPlan` |
| 4 | Clearing the mode turns lane phases back into "built, PR not opened"; deploy and prune miss them | high | C | PE1 AT2 | V (`phase-stage.ts:16-18`) | Same write copies the final PR onto lane docs; deploy uses `finalPr.phases` |
| 5 | Turning the mode on goes through two scalar single-key writes that can be queued, with checks outside the write | high | C | PE4 PA4 IA4 AT4, synthesizer | V (`field.ts:6,13`, `spec-doc.ts` drops unknown keys) | One `specBranchPlan`; never queued |
| 6 | Takeover re-runs `crew start`, which refuses on its own spec branch; not idempotent after a partial failure | high | C | AT4 IA4 | V (`oversee-crew.md:77`) | Mode on → skip checks, cut if missing |
| 7 | A cross-lane need is met by the tick before the code reaches `feat/<spec>` | high | C | PE6 IA3 AT3 | V (`ready-set.ts:46`) | `pickRows` holds the row until the lane's worker closes out |
| 8 | Run file has no end state: whole-board skip is permanent and silent | high | C | IA6 AT5 | V (`run-state.ts:67-69`) | `finished` state; `Overseen:` line when the overseer is gone |
| 9 | Overseer-ness defined three ways; `crew check` has no spec | high | C | PE8 CQ2 IA7 AT5 | V (`check.ts:9-16`) | One `specRun`; check searches every run file |
| 10 | A plan write during the run can break the start invariants | high | U | AT6 | V (`phases/add.ts`: `pr` optional) | Writer refuses in the mode |
| 11 | Old local lane branches/trees reused whatever their base | high | U | AT7 | V (`acquire.ts:18-19`) | Check 4 covers local branches and trees |
| 12 | Phase 1 skips on a field that Phases 2/3 read and write | medium | C | PE5 CQ4 IA5 | V | Field half moves to Phase 3; record is the only source |
| 13 | Whole-board relaunches bypass `scopeWorld`; `crew start --spec` checks only live workers | medium | U | IA8 | V (`tick.ts:125`) | Relaunches filtered; refuse on any `run.md` entry for the spec |
| 14 | Old `default` PR document collides with the final PR; done phases counted by the `pr:` check | medium | C | PE2 IA13 | V (`pr-sync.ts:41-45`) | Open phases only; numbered `default` doc refuses |
| 15 | Notice is assigned over existing notices; launched workers can't be matched cheaply | medium | C | CQ6 CQ7 IA11 | V (`write-notice.ts:31`) | Append; no worker test |
| 16 | Close-out "lane HEAD in `feat/<spec>`" fails after the snapshot merge / a race | medium | C | IA12 AT8 | V (`publish.ts:55-61`) | Record evidence sha containment |
| 17 | `[handoff] <spec> phase <id>` subject is prose agents must remember; the record already has commit evidence | medium | U | PA3 (AT14's prefix bug moot) | V (`record-tick.ts:47-54`) | Read task evidence; subject change dropped |
| 18 | Step 4 snapshot push to `feat/<spec>` duplicates what main carries; moves the branch twice per push | medium | C | PA7 AT10 | V (`publish.ts:45-56`, `snapshot.ts:57-63`) | Step 4 and `mergeCommit` dropped |
| 19 | Plain push to `feat/<spec>`: no timeout, prompt guard or `--no-verify` | medium | U | PA5 | V (`remote-push.ts`) | `leasePush` with HEAD-contains-tip guard |
| 20 | `--push` publishes docs without the `docs: main` check | medium | U | IA10 | V (`publish-docs.ts:13`) | Gated on settings |
| 21 | Conflict path skips the main merge and the gates | medium | U | AT9 | spec text | "then `merge-back` again" |
| 22 | Machine count read twice (port + refusal); "overshoot by one" is wrong; relaunches lost; silent when full | medium | C | CQ5 AT11 | V (`agents.ts:27`, `launch-session.ts:33`) | `FillContext` + `machineBusy`; relaunch exempt; `Machine full` line |
| 23 | Lane `PR group ready` still starts a per-lane PR moment | medium | U | AT13 | V (`tick-step.ts:41`) | Final-PR moment line |
| 24 | No per-spec layout source in a multi-spec tick | medium | U | CQ3 | V (`spec-state.ts` has no meta) | `TickWorld.layouts` |
| 25 | `crewStart` grows into a branch cutter | medium | U | CQ8 | I | `crew/spec-branch-start.ts` |
| 26 | `tick.ts` heads toward 250 lines | medium | U | CQ9 | I (162 today) | `tick-ports.ts` refactor first |
| 27 | `shipAloneSuggestions(state)` can't call `resolvedPhaseKeys`; wrong module | medium | U | CQ10 | V (`phase-keys.ts:11`) | `ready/build-order.ts`, `(state, nodes)` |
| 28 | Stale `--main` paragraph in Phase 3 | low (high if built) | C | PE7 CQ1 IA9 AT15 PA10 | V (`phase-3…:45`) | Deleted |
| 29 | Phase 1's Goal still says "several lanes at once" | low | U | synthesizer | V | Goal reworded |
| 30 | `buildOrder`: `needs-deployed` met only when deployed; unknown refs dropped by `resolvedPhaseKeys`; own cycle check | low | C | IA13 PA8 | V (`ready-set.ts:47`, `phase-keys.ts:14`) | Applied |
| 31 | `pushBranch` signature change has 6 callers | low | U | IA13 | V | `base` optional |
| 32 | Merge-back names gates but doesn't expand them | low | U | PA9 | V (`execute.md:199`) | `spec.ts gates --name` lines |
| 33 | Close-out real-git test has no home | low | U | CQ11 | V | `sequencedRunner` pure test |
| 34 | `claimKey` already maps `babysit default` | low | C | CQ13 IA13 | V (`close-out-run.ts:22`) | Test only |
| 35 | Design says `merge-back` catches a self-made group; on the record the split lands at base | low | U | IA13 | V | Reworded; the invariant refusal (#10) catches the ungrouped case |
| 36 | `publishDocs` result field `mergeBack` collides with the new command's name | low | U | CQ12 | V (`publish.ts:13`) | Rename `snapshotMerged` in Phase 3 |

## Rejected or unverified

- **PA6, drop the writer-side notice entirely:** rejected. The product brief promises that other sessions see the
  overseer, and the tick's diff only reaches the overseer. Kept, made cheaper (#15).
- **AT10's docs-only "no regate" fast path:** superseded by dropping step 4 (#18). Docs no longer move `feat/<spec>` on
  their own. A docs merge that arrives through main gets gated with everything else.
- **AT11's "count roster entries launched under 60 s ago":** rejected as gold plating. The soft limit is documented
  honestly instead.
- **AT14's grep anchor:** moot, since the grep is gone (#17).
- **PE F4's "delete the branch if the record write is refused":** superseded. The record is written first and the cut
  second, so a refused write leaves nothing to clean up.
