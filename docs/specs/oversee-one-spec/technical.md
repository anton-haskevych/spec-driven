# Oversee One Spec — Technical

Ground truth: `research/2026-11-17-wave-1-crew-branches-order.md`, `research/2026-11-17-wave-2-crm-run-naming-marker.md`,
`research/2026-11-17-craft-crew-spec-scope.md`, reviews `reviews/2026-11-17-spec-branch-lifecycle.md` and
`reviews/2026-11-17-final-pr-and-mode-ends.md`. T = `skills/spec/tools`.
Every command prints its result as the last stdout line and exits 0 (house rule); refusals are
`<command>: <what happened>; <what to do>`.

## Terms

- **Spec-branch mode** — a spec whose record document holds `specBranch: { cutFrom, shipAlone }`. Crew state, not a
  user field (not in `SPEC_FIELD_KEYS`, never in `CLAUDE.md`). `crew start --spec` writes it in one `specBranchPlan`
  record write; `prSyncPlan` removes it in the write that records the final PR merged, whoever merged it. A closed
  final PR keeps it. Only a spec joined to the board record may turn it on
  (`decision-spec-branch-needs-the-record`). Never inferred from a branch existing.
- **Spec branch** — `feat/<spec>` on origin, cut from `origin/<default>` when the mode turns on. It is group `default`'s
  branch (`DEFAULT_PR_GROUP`, `T/plan/docs/pr-doc.ts:11-12,54-56`), which no phase can use in this mode because every
  code phase must carry `pr:`.
- **Lane** (prose; code says *group*) — a PR group of the spec: one tree, branch `feat/<spec>-pr-<g>` (unchanged
  naming), cut from the spec branch. Only one worker runs per lane, because git checks a branch out once.
- **Ship-alone group** — a group named in the spec's `specBranch.shipAlone` list (`ship-alone` in prose). It is cut from `origin/<default>`, opens its PR
  to the default branch, and reaches the spec branch only when a lane merges main. The list is set once at start and
  frozen: a group can't join or leave it once its branch exists. A ship-alone group may not `need` a phase of another
  group.
- **Layout** — `specLayout(state, specBranch?)` in `T/pr/groups.ts`, pure. It returns `{ mode, groups: Map<group,
  { branch, base, shipsAlone }>, finalPr?: { head, base, phases } }`. `branchOf(layout, group)` is the one
  group-to-branch lookup (`default` → `feat/<spec>` in the mode); no caller uses `treeName` for a group directly.
  Commands build layouts once from loaded state and pass them down (a tick: `TickWorld.layouts`, one per spec);
  pure callers never take `git`.
- **Spec run** — `specRun(spec)`: `crew/run-<spec>.md` with state neither `stood-down` nor `finished`. The one answer
  to "does this spec have an overseer?" for launch, check, the whole-board skip and the notice.

## Phase 1 — one overseer per spec

**Run file.** `runFileStore(projectDir, runner, spec?)` (`T/crew/deps.ts:38-53`): with `spec` it uses
`crew/run-<spec>.md`, else `crew/run.md`, so the 5 existing callers are unchanged. `RunFile` and `newRunFile`
(`T/crew/run-state.ts:29-37,67-70`) gain `spec?: string` (frontmatter `spec:`). Briefs stay
`crew/briefs/<spec>#<target>.md`. A `listRunFiles()` helper sits beside `runFileStore`.

**Commands.** `crew overseer|start|tick` take `--spec <spec>` (parseArgs, house style). `crew launch` reads the spec
from its positional arguments and uses `run-<spec>.md` whenever `specRun` finds it, live overseer or not, so a
forgotten flag or a dead overseer can't misfile a worker. `crew check <id>` searches every run file for the id.
`crew wait` is unchanged. First commit: `systemTickPorts` moves to `T/commands/crew/tick-ports.ts` and
`fillSlots`'s inputs fold into one `FillContext`. With `--spec`:
- `crew overseer` / `crew start` read `run-<spec>.md`; `whoseRun` is unchanged. `crew start --spec` refuses while the
  whole-board `run.md`'s `## Launched` holds any entry on that spec, live or not (a dead one would be relaunched):
  `crew start: the board crew has <title · id> on <spec>; pause it first`.
- `crew tick --spec`: pure `scopeWorld(world, { spec })` in `T/crew/scope.ts` keeps the spec's ready rows and questions,
  and the tick prints `noticePlanChange` for the spec (`T/plan/plan-version.ts`) when its plan moved since the last
  tick.
- `crew tick --spec` writes `state: finished` once the spec has no open phase and no launched session, so the run
  ends and the whole-board crew can pick the spec up again later.
- One worker per spec still holds in Phase 1 (the `pickRows` key is unchanged). Parallel lanes arrive with Phase 3.

**Whole-board skip.** The whole-board tick skips every spec with a `specRun`, whether its overseer is live or not,
since workers outlive overseers: its ready rows and its close-out relaunches (`tick.ts:125` puts relaunches before
`pickRows`). This is `scopeWorld(world, { overseen })` through a `TickPorts.overseen()` port. Phase 3 adds specs in
spec-branch mode to the skip; Phase 1 reads no `specBranch`. Silent while the overseer is live; when it is gone, one
line: `Overseen: <spec> (no live overseer, N workers)`.

**Machine limit.** `machineWorkers(agents)` in `T/crew/machine.ts` counts `loadAgents` rows (unfiltered, every repo)
whose title parses as `<spec> execute <phase>` (`T/launch/title.ts:19-25`) and whose state is `working` or `blocked`.
A `done` worker waiting for close-out holds no slot. The limit is a constant 6, with no override yet. No new port: the
tick already loads `claude agents --json --all` (`T/sessions/agents.ts:27`), so `FillContext` carries the count and
`fillSlots` caps its picks at `min(run cap free, 6 - count)`. The refusal itself lives once, in `launchCrewSession`
(`T/commands/crew/launch-session.ts`), which both `crew launch` and the tick go through, reading
`CrewLaunchRequest.machineBusy` (the tick fills it; `crew launch` loads agents once when unset):
`launch: 6 of 6 machine workers busy; nothing launched`. Babysitters are not counted, and neither are relaunches: they
reuse the slot the closed-out worker freed. A tick the limit blocks prints `Machine full: 6 of 6` once. The limit is
soft: two overseers ticking at the same moment can each fill to it.

**Overseer notice on plan writes.** Computed in `T/commands/phase/context.ts` `writerFor`, which wraps the writer;
`T/plan/` stays crew-agnostic. It applies when `specRun` finds the spec's run with a live overseer (`whoseRun`, which
follows a parked tab) and the writer is not the overseer. Only plan-shape actions (`add`, `split`, `move`, `set`,
`task`) get it, from anyone, so the #1295 self-split reaches the overseer; ticks, notes, parks and deploys pass
silently. There is no launched-worker test (the run file holds short ids, not session ids). The line is appended
through `appendNotice` in `T/plan/phase-writer.ts`, never assigned over the plan-changed and upgrade lines (this also
fixes the overwrite at `T/plan/write-notice.ts:31`): `Notice: <spec> is overseen by <id>; tell it about this change
(SendMessage "<spec> oversee-crew")`. It never refuses. Liveness inputs are loaded as `T/claims/live.ts:20-29` loads
them, and only after the run file is found.

**Entry.** `/spec oversee-crew [<spec>]`: SKILL.md `:56` (an optional spec, never inferred), `:73`, `:89`;
`T/launch/command-line.ts:35-37` refusal text names the spec form; `tests/launch.test.ts:127-128`. No new
sub-command. The overseer session is titled `<spec> oversee-crew` (renamed at start) so SendMessage can reach it.

## Phase 2 — build order

`ready <spec> --order` (`T/commands/ready.ts`, gains `READY_USAGE` + parseArgs). Pure `buildOrder(state, nodes)` in
`T/ready/build-order.ts` composes `phaseNeeds` (`T/ready/ready-set.ts:39-42`) and `resolvedPhaseKeys`
(`T/board/phase-keys.ts:11-17`) the way `unblockCounts` does (`T/board/rank.ts:29-30`):
- Only open phases count. A `needs` on a done phase is met; a `needs-deployed` only once deployed (`ready-set.ts:47`).
  A need on another spec's open phase blocks and is listed as waiting, and so is an unknown reference, read through
  `resolvePhaseRef` (`resolvedPhaseKeys` silently drops it).
- **Batches**: longest-path layering over same-spec `needs` + `needs-deployed`; batch 0 is ready now. The later phase
  of a `same-files-as` pair goes one batch after the earlier one, as `readySet` would run it.
- **Cycle**: `needsCycle` (`T/core/phase-edges.ts:36`) fed a `needsOf` over resolved keys, needs + needs-deployed,
  before layering; prints `Cycle: 4 → 6 → 4` and no Order line. The record already refuses `needs` cycles, so on a
  joined spec only a `needs-deployed` loop reaches it.
- **Longest chain**: the phases on the longest path by phase count; ties go by phase order.
- Task phases (`code: false`) are shown with `(task)`.

Render (`T/ready/render.ts`):
```
Order: 1 → [2 · 3a · 9] → [4] → [6 · 7 · 8 · 3] → 10
Longest: 2 → 4 → 6 → 10 (4 phases)
Lanes: A 2,4,5 · P 6 · M 7 · H 8 · L 3 · D 3a (ships alone) · J 9
Ships alone? D (3a is a needs-deployed target)
No lane: 11, 12 (give them a pr: group before spec-branch mode)
Same files: 6 and 11 (11 runs after 6)
Waiting on other specs: 13 needs mindbody-sync-engine-improvements#8
```
`specLayout` and `branchOf` live in `T/pr/groups.ts` and ship here, with the `specBranch` reader on `SpecDoc`
(`T/plan/docs/spec-doc.ts`) and `RecordFields` (`T/graph/spec-fields.ts`). `shipAloneSuggestions(state, nodes)` (groups
holding a phase another phase lists in `needs-deployed`, resolved the way `T/board/deploy-waits.ts:10-19` does) lives
in `T/ready/build-order.ts`, its only consumer, so `pr/groups.ts` imports nothing from the board layer. The
`(ships alone)` marker reads `specBranch.shipAlone`. The `Ships alone?` line is only a suggestion for
the overseer. No regroup or split suggestions: those are the overseer's judgement.

## Phase 3 — the spec branch and merge-back

**Turning the mode on.** `crew start --spec` gains this through `T/crew/spec-branch-start.ts` (a pure
`specBranchRefusal(state, layout, branches)` plus the cut), with one refusal per check:
1. The spec must be joined to the record.
2. Every *open* code phase must have `pr:` (done phases keep their history).
3. No ship-alone group may `need` another group's phase.
4. The record's `default` PR document must not hold a number (an earlier ungrouped PR would be overwritten).
5. Neither `feat/<spec>` nor any `feat/<spec>-pr-*` may exist on origin, as a local branch or as a tree; the refusal
   names them (an old local lane branch would otherwise be reused on its old base, `T/trees/acquire.ts:18-19`).

Then, in this order:
- one `specBranchPlan` record write (registered like `FIELD_COMMAND`; checks 2–4 run again at the tip) sets
  `specBranch: { cutFrom: <origin/<default> sha>, shipAlone: [...] }` on the spec document and creates the `default` PR
  document (`not-opened`, branch `feat/<spec>`). Never queued: offline is a refusal;
- the cut: `cutFrom` pushed to `refs/heads/feat/<spec>` with a create-only `leasePush`;
- `Spec branch: feat/<spec> cut from <default> <sha>` before its `Crew:` line.

A re-run with the mode already on is a takeover (`oversee-crew.md` always runs `crew start`): the checks are skipped,
and the branch is cut only if it is missing. In the mode the phase writer refuses what would break the layout: a code
phase without `pr:` (`phase add` without `--pr`, `phase set --pr none`), a ship-alone group needing another group's
phase, and a change to the ship-alone membership of a group whose branch exists. These are invariants, not an
ownership lock, so they hold with the overseer dead.

**Parallel lanes.** `pickRows` (`T/crew/pick.ts:22-38`) and the tick's `busy` (`T/commands/crew/tick.ts:118-124`) both
key on one `groupKey(spec, group, layout)`, with layouts from `TickWorld.layouts` (built once in `tick-ports.ts` from
the loaded nodes and states). In spec-branch mode that is `<spec>#<group>`, otherwise `<spec>`. The tick looks a
launched worker's group up from `states`. `treeBusy` still serialises the phases of one lane. The whole-board skip
(Phase 1) adds every spec in spec-branch mode.

**Cross-lane needs.** A phase reads done on the record at its last tick, which comes before its handoff's
`merge-back --push`. In the mode `pickRows` holds a row while a phase it needs sits in a lane whose launched worker
hasn't closed out (Phase 4's close-out proves the phase is on `feat/<spec>`). So a dependent's first `merge-back`
holds the code it builds on.

**Base of a tree.** Placement names a group's branch with `branchOf` and cuts it from `specLayout(...).groups.get(g).base`: `origin/feat/<spec>` for
a lane, `origin/<default>` for a ship-alone group or outside the mode. `addTree(git, name, root, base, timeout)`
(`T/trees/acquire.ts:16-29`) renames its param from `defaultBranch`; its one production caller is
`T/trees/place-system.ts:38`. Nothing is recorded in git config. `pushBranch` splits its parameter:
`pushBranch(git, { defaultBranch, base? }, options)`, `base` defaulting to `defaultBranch`, so its six callers
(`plan/record-tick.ts:49`, `commands/claim-push.ts:19`, `publish-docs.ts:20,28`, `push.ts:16`, `pr/actions/open.ts:102`)
change only where a lane passes its base. The code-on-main guard keeps `defaultBranch`, and ahead/behind uses `base`
(`T/publish/push.ts:50-65`).

**Board record.** While the mode is on, lane groups never get the unopened-PR row ("built, PR not opened"); only
group `default` and ship-alone groups can. Once the final PR merges, Phase 5 copies it onto every lane document, so
stage, cards, activity and prune read each lane's own document, mode on or off. Plan ops (`missingPrDocs` in
join/change/upgrade) are unchanged: `specBranchPlan` creates the `default` document.

**`merge-back <spec> [--push]`** (`T/commands/merge-back.ts`, logic and render in `T/publish/merge-back.ts`, an outcome
union like `T/publish/sync-main.ts`). Run by a worker in its lane tree. Outside spec-branch mode it refuses:
`merge-back: <spec> has no spec branch`. The current branch must be a group of the layout read at base (record), and
not ship-alone, else `merge-back: <branch> is not a lane of <spec>; push your phase from your lane's tree`.
- *no flag*: fetch `feat/<spec>` and `<default>`. Merge `origin/feat/<spec>` into the tree, then `origin/<default>`
  (each `git merge --no-edit`, skipped when already contained).
  - Both already held: `<branch> already holds feat/<spec> and <default> · merge-back <spec> --push`.
  - Clean: `Merged feat/<spec> (+N) and <default> (+M) into <branch> · run the gates below, commit, then
    merge-back <spec> --push`, followed by the `spec.ts gates --name <gate>` lines (per-commit, and after-merge-main
    only when main came in).
  - Conflict: the merge is left in progress:
    `merge-back: <branch> conflicts with <feat/<spec>|<default>> in <paths>; resolve it here, commit, then merge-back <spec> again`.
    The re-run carries on with main and prints the gates, so a hand resolution never reaches the spec branch ungated.
- `--push`: refuses a dirty tree or a merge in progress.
  1. Fetch `feat/<spec>`; refuse with the "moved" line unless HEAD holds `origin/feat/<spec>`.
  2. `pushBranch` the lane to its own name.
  3. `leasePush(git, "refs/heads/feat/<spec>", <that tip>, "HEAD:refs/heads/feat/<spec>")` (`T/core/remote-push.ts`:
     timeout, no credential prompt, `--no-verify`). Step 1 keeps the lease a fast-forward. A refusal prints
     `merge-back: feat/<spec> moved; run merge-back <spec> again`; offline prints the reason.
  4. Only when settings say `docs: main` (the check lives in the `publish-docs` command, not in `publishDocs`):
     `publishDocs` (`T/publish/publish.ts`) runs unchanged in the lane. It snapshots, lands on main, and merges the
     snapshot into HEAD. Nothing more is pushed: every lane's next `merge-back` brings main, and with it the snapshot,
     into `feat/<spec>` gated. `publishDocs`' `mergeBack` result field is renamed `snapshotMerged`.
  - Result: `Merged back: <branch> → feat/<spec> (+N) · docs published to main` (the docs part only with `docs:
    main`). A docs refusal prints after the push line, never undoes the push, and the next `--push` retries it, since
    `publishDocs` snapshots everything since the last published snapshot.

Main reaches the spec branch only through lanes: gated, and with any conflict resolved in a tree. The final-PR
babysitter merges main once every lane is done.

**Unplanned branches.** `merge-back` refuses a non-lane branch (above). In spec-branch mode `pr open` refuses a head
that is neither `feat/<spec>` nor a ship-alone group: `pr open: <spec> ships from feat/<spec>; <branch> is a lane, its
work reaches the PR through merge-back`. `publish-docs` and `push` refuse in a lane tree in spec-branch mode:
`<command>: <branch> is a lane of <spec>; use merge-back <spec> --push`.

## Phase 4 — close-out and prune on the spec branch

Close-out (`T/crew/close-out-run.ts:37-80`) in spec-branch mode, for a lane worker, reads the record, not commit
subjects (the record holds `<sha> on origin/<lane>` for every code tick, `T/plan/record-tick.ts:47-54`):
- merged back = the phase's last task evidence sha is an ancestor of `origin/feat/<spec>`. Never HEAD ==
  `origin/<lane>` (the docs snapshot merge moves HEAD past it). On failure:
  `commits not merged back → merge-back <spec> --push`.
- Crew line: the last turn, else the body of the newest `[handoff] <spec>` commit on `origin/<lane>` since launch (this
  ends the CRM false alarm). `--since` stays ISO.
- A lane's `PR group ready` starts no PR moment (`T/crew/tick-step.ts:41`); Phase 5 adds the final one.

Extraction: an optional layout on `CloseOutWorld`. `claimKey` already maps `<spec> babysit default` to
`<spec>#pr-default` (`close-out-run.ts:22`): a test case, no code.

Prune (`T/trees/prune-rules.ts:24-31`): a lane tree also counts as merged when its `origin/<lane>` is an ancestor of
`origin/feat/<spec>`, its lane has no open phase, and the tree adds only spec-doc commits beyond it; or when its lane
document reads merged (Phase 5). The spec branch's own tree prunes as today, by its merged PR's head
(`gotcha-squash-merged-branch-is-not-an-ancestor`). The layout is passed in, so the rule stays pure.

## Phase 5 — the final PR and ship-alone groups

- **Group `default` becomes real.** Today only `pr-doc.ts` knows `default` means `feat/<spec>`. Every group-to-branch
  lookup goes through `branchOf(layout, group)`: `pickGroup` (`T/pr/groups.ts:23`) builds `default` from
  `layout.finalPr.phases`; `wholeGroup` (`T/trees/place.ts:98-100`) and `place.ts:67`, `T/pr/resolve.ts:64`,
  `T/pr/actions/open.ts:44`, `T/context/babysit-pack.ts:27` and `T/board/tree-target.ts:20` stop calling `treeName`
  for a group (it would make `feat/<spec>-pr-default`).
- **Opening it.** `pr open <spec> default`, or `pr open <spec>` with no group in spec-branch mode. Head `feat/<spec>`,
  base default; title `<spec>` plus phases; the body lists every phase outside ship-alone groups with its Outcome. The
  babysitter opens it from its tree on `feat/<spec>` (`createPr` needs a tree on the head, `open.ts:98-99`).
- **PR moment.** The tick prints `PR moment: <spec> final PR` once every code phase outside the ship-alone groups is
  done; the overseer launches the babysitter, which opens the PR.
- **PR document** (record): the `default` document exists from `specBranchPlan` and is matched by branch
  (`T/plan/pr-sync.ts:54-74`). Ship-alone groups keep theirs. Lane documents stay `not-opened` while the run lasts.
- **The mode ends in `prSyncPlan`.** When the `default` document turns merged, the same record write copies its number,
  state and merge onto every lane group's document and removes `specBranch`. Every merge path writes through it
  (`pr merge`, `pr status`, a board load that sees a GitHub merge, `T/board/load.ts:138`), so a merge by hand ends the
  mode too. A closed final PR keeps the mode (a reopen or new PR still works) and is a Needs-you row. Deploy marking
  (`babysit.md:120`) covers `finalPr.phases`.
- **How to review** (`pr hold --how-to-review`): one section per phase with its Outcome, its files to touch, and its
  commits from its tasks' record evidence shas.
- **Babysit.** `launch babysit <spec> default` cuts or takes over a tree on `feat/<spec>` through `branchOf` (the final
  PR's placement is not `existingOnly`, `T/launch/place-for-launch.ts:19`: nothing else ever puts a tree there). Its
  claim is the existing `pr-default` (`T/claims/pr-claim.ts`); `takeRefusal` (`T/claims/rules.ts:48-57`) accepts it in
  spec-branch mode. When behind, it merges `origin/<base>` (= default), as today, and is then the only writer of main
  into the spec branch. A lane push while the PR is open (a phase added late) is a non-fast-forward for it: it merges
  `origin/feat/<spec>` and carries on. It fixes review comments in its own tree; there is no group's last phase to
  relaunch.
- **Ship-alone groups.** Unchanged: a per-group PR moment from a tree cut from main. Their code reaches the spec
  branch the next time a lane merges main.

## Phase 6 — the overseer runs a spec end to end

- **`oversee-crew.md`** gets a *One spec* section:
  - Start: `crew overseer --spec`, `ready <spec> --order`, regroup and split with `phase set|split`, pick
    the ship-alone groups, list each under *Say if wrong*, then `crew start --spec` (again on takeover: checks skipped).
  - Ticks run with `--spec`; the run ends `finished` when nothing is left.
  - The PR moment is the tick's `PR moment: <spec> final PR` line: launch the babysitter for `default`, which opens the
    PR from its tree and carries it in ship mode (hold-for-review: *How to review* per phase).
  - Ship mode never waits on a question: the spec's `ship:`, else settings `pr.ship`, else `hold-for-review`
    (`decision-final-pr-holds-by-default`).
- **`crew-brief.md` brief:** `Spec branch: feat/<spec>. Before coding: merge-back <spec>. At handoff: merge-back <spec>,
  the gates it names, merge-back <spec> --push. Never create or push other branches.`
- **`execute.md` §1 / *Crew worker*, `handoff.md` §3–§4:** in spec-branch mode a lane runs merge-back instead of
  `publish-docs`/`push`, and the `Crew:` line also goes in the `[handoff]` commit body.
- **`SKILL.md`:** the dispatch row, the Crew / Trees / Remote bullets, and the new `merge-back` and `ready --order` tool
  lines.

## Tests

Per `research/2026-11-17-craft-crew-spec-scope.md`: pure where possible (`gitStub`, `fakeRef`, `sequencedRunner`).
- **Pure tests:**
  - `specLayout`, `branchOf` and `shipAloneSuggestions` (mixed spec refused; frozen ship-alone; no-group spec has no
    mode; `default` → `feat/<spec>`);
  - `specBranchRefusal`, `specBranchPlan` and the `prSyncPlan` mode end (lane documents copied, `specBranch` removed;
    closed keeps it);
  - `pickRows` holding a cross-lane need;
  - `scopeWorld`;
  - `groupKey` agreeing for `pickRows` and the tick's `busy`;
  - `buildOrder` (linear, declared edges, ranges, cross-spec, task phases, cycle, same-files pair);
  - `machineWorkers` states.
- **Real git only for:**
  - the `addTree` base;
  - `publish-merge-back.git.test.ts` (new; `REAL_GIT_CAP` +1 in the same diff; repos built in `beforeAll`). Cases:
    clean, already holds, main merged in, conflict left in progress, HEAD missing the tip, lease refused as moved,
    docs refusal after push, `docs: branch` publishes nothing.
- **Close-out and prune:** pure, with `sequencedRunner` (`merge-base --is-ancestor`, `log`); no real-git cap change.
- **Fast `CrewDeps` builder on `gitStub`:** build it only if fast-tests phase 8 hasn't landed it.
