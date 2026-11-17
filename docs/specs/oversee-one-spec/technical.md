# Oversee One Spec — Technical

Ground truth: `research/2026-11-17-wave-1-crew-branches-order.md`, `research/2026-11-17-wave-2-crm-run-naming-marker.md`,
`research/2026-11-17-craft-crew-spec-scope.md`, review `reviews/2026-11-17-spec-branch-lifecycle.md`. T = `skills/spec/tools`.
Every command prints its result as the last stdout line and exits 0 (house rule); refusals are
`<command>: <what happened>; <what to do>`.

## Terms

- **Spec-branch mode** — a spec whose fields say `spec-branch: on` (a record field for a joined spec, like `ship:`).
  `crew start --spec` writes it with `ship-alone:`; `pr merge` of the spec-branch PR (or its close) clears both. Only
  a spec joined to the board record may turn it on (`decision-spec-branch-needs-the-record`). Never inferred from a
  branch existing.
- **Spec branch** — `feat/<spec>` on origin, cut from `origin/<default>` when the mode turns on. It is group `default`'s
  branch (`DEFAULT_PR_GROUP`, `T/plan/docs/pr-doc.ts:11-12,54-56`), which no phase can use in this mode because every
  code phase must carry `pr:`.
- **Lane** (prose; code says *group*) — a PR group of the spec: one tree, branch `feat/<spec>-pr-<g>` (unchanged
  naming), cut from the spec branch. Only one worker runs per lane, because git checks a branch out once.
- **Ship-alone group** — a group named in the spec's `ship-alone:` list. It is cut from `origin/<default>`, opens its PR
  to the default branch, and reaches the spec branch only when a lane merges main. The list is set once at start and
  frozen: a group can't join or leave it once its branch exists. A ship-alone group may not `need` a phase of another
  group.
- **Layout** — `specLayout(state, meta)` in `T/pr/groups.ts`, pure. It returns `{ mode, groups: Map<group, { branch,
  base, shipsAlone }>, finalPr?: { head, base, phases } }`. Every tool reads branch, base and ship-alone from it.
  Commands build it once from loaded state and pass it down; pure callers never take `git`.

## Phase 1 — one overseer per spec

**Run file.** `runFileStore(projectDir, runner, spec?)` (`T/crew/deps.ts:38-53`): with `spec` it uses
`crew/run-<spec>.md`, else `crew/run.md`, so the 5 existing callers are unchanged. `RunFile` and `newRunFile`
(`T/crew/run-state.ts:29-37,67-70`) gain `spec?: string` (frontmatter `spec:`). Briefs stay
`crew/briefs/<spec>#<target>.md`. A `listRunFiles()` helper sits beside `runFileStore`.

**Commands.** `crew overseer|start|tick` take `--spec <spec>` (parseArgs, house style). `crew launch|check` read the
spec from their positional arguments and use `run-<spec>.md` when it exists with a live overseer, so a forgotten flag
can't misfile a worker. `crew wait` is unchanged. With `--spec`:
- `crew overseer` / `crew start` read `run-<spec>.md`; `whoseRun` is unchanged. `crew start --spec` refuses while the
  whole-board run has a *live* launched worker on that spec:
  `crew start: the board crew has <title · id> on <spec>; pause it first`.
- `crew tick --spec`: pure `scopeWorld(world, { spec })` in `T/crew/scope.ts` keeps the spec's ready rows and questions,
  and the tick prints `noticePlanChange` for the spec (`T/plan/plan-version.ts`) when its plan moved since the last
  tick.
- One worker per spec still holds in Phase 1 (the `pickRows` key is unchanged). Parallel lanes arrive with Phase 3.

**Whole-board skip.** The whole-board tick skips every spec that has `spec-branch: on` or a `run-<spec>.md` whose state
is not `stood-down`, whether its overseer is live or not, since workers outlive overseers. This is
`scopeWorld(world, { overseen })` through a `TickPorts.overseen()` port. It is silent: `crew tick` prints only what
needs action.

**Machine limit.** `machineWorkers(agents)` in `T/crew/machine.ts` counts `loadAgents` rows (unfiltered, every repo)
whose title parses as `<spec> execute <phase>` (`T/launch/title.ts:19-25`) and whose state is `working` or `blocked`.
A `done` worker waiting for close-out holds no slot. The limit is a constant 6, with no override yet. `fillSlots` caps
its picks at `min(run cap free, 6 - count)` through a `TickPorts.machineCount()` port. The refusal itself lives once,
in `launchCrewSession` (`T/commands/crew/launch-session.ts`), which both `crew launch` and the tick go through:
`launch: 6 of 6 machine workers busy; nothing launched`. Babysitters are not counted. The limit is soft: two
overseers ticking at once may overshoot by one. `fillSlots`'s inputs fold into one `FillContext` object.

**Overseer notice on plan writes.** Computed in `T/commands/phase/context.ts` `writerFor`, which wraps the writer;
`T/plan/` stays crew-agnostic. It applies when `run-<spec>.md` exists with a live overseer (`whoseRun`, which follows a
parked tab) and the writer is not the overseer. A launched worker's ticks and notes pass silently. Its plan-shape
writes (`add`, `split`, `move`, `set`, `task`) get the notice like anyone's, so the #1295 self-split reaches the
overseer. The outcome gets `notice: "Notice: <spec> is overseen by <id>; tell it about this change (SendMessage
\"<spec> oversee-crew\")"`. It never refuses. Liveness inputs are loaded as `T/claims/live.ts:20-29` loads them, and
only after the run file is found.

**Entry.** `/spec oversee-crew [<spec>]`: SKILL.md `:56` (an optional spec, never inferred), `:73`, `:89`;
`T/launch/command-line.ts:35-37` refusal text names the spec form; `tests/launch.test.ts:127-128`. No new
sub-command. The overseer session is titled `<spec> oversee-crew` (renamed at start) so SendMessage can reach it.

## Phase 2 — build order

`ready <spec> --order` (`T/commands/ready.ts`, gains `READY_USAGE` + parseArgs). Pure `buildOrder(state, nodes)` in
`T/ready/build-order.ts` composes `phaseNeeds` (`T/ready/ready-set.ts:39-42`) and `resolvedPhaseKeys`
(`T/board/phase-keys.ts:11-17`) the way `unblockCounts` does (`T/board/rank.ts:29-30`):
- Only open phases count. A need on a done phase is met. A need on another spec's open phase blocks and is listed as
  waiting, and so is an unknown reference.
- **Batches**: longest-path layering over same-spec `needs` + `needs-deployed`; batch 0 is ready now. The later phase
  of a `same-files-as` pair goes one batch after the earlier one, as `readySet` would run it.
- **Cycle**: detected before layering; prints `Cycle: 4 → 6 → 4` and no Order line.
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
`specLayout` and `shipAloneSuggestions(state)` (groups holding a phase another phase lists in `needs-deployed`,
resolved through `resolvedPhaseKeys` the way `T/board/deploy-waits.ts:10-19` does) live in `T/pr/groups.ts` and ship
here. The `(ships alone)` marker reads the spec's `ship-alone:` list. The `Ships alone?` line is only a suggestion for
the overseer. No regroup or split suggestions: those are the overseer's judgement.

## Phase 3 — the spec branch and merge-back

**Turning the mode on.** `crew start --spec` gains this, with one refusal per check:
1. The spec must be joined to the record.
2. Every code phase must have `pr:`.
3. No ship-alone group may `need` another group's phase.
4. Neither `feat/<spec>` nor any `feat/<spec>-pr-*` may already exist on origin; the refusal names them.

It then cuts the spec branch with `git push origin origin/<default>:refs/heads/feat/<spec>` (create-only lease), writes
`spec-branch: on` and `ship-alone: [...]` through the field writer `ship` uses, and prints
`Spec branch: feat/<spec> cut from <default> <sha>` before its `Crew:` line. `phase set` refuses to change the
`ship-alone:` membership of a group whose branch exists.

**Parallel lanes.** `pickRows` (`T/crew/pick.ts:22-38`) and the tick's `busy` (`T/commands/crew/tick.ts:118-124`) both
key on one `groupKey(spec, group, layout)`. In spec-branch mode that is `<spec>#<group>`, otherwise `<spec>`. The tick
looks a launched worker's group up from `states`. `treeBusy` still serialises the phases of one lane.

**Base of a tree.** Placement cuts a group's branch from `specLayout(...).groups.get(g).base`: `origin/feat/<spec>` for
a lane, `origin/<default>` for a ship-alone group or outside the mode. `addTree(git, name, root, base, timeout)`
(`T/trees/acquire.ts:16-29`) renames its param from `defaultBranch`; its one production caller is
`T/trees/place-system.ts:38`. Nothing is recorded in git config. `pushBranch` splits its parameter:
`pushBranch(git, { defaultBranch, base }, options)`. The code-on-main guard keeps `defaultBranch`, and ahead/behind
uses `base` (`T/publish/push.ts:50-65`).

**Board record.** In spec-branch mode `joinedActivity` (`T/board/joined-activity.ts:33-35`) and the unopened-PR rows
read a lane's built state against the `default` PR document, never the lane's own `not-opened` one, so a finished lane
is not "built, PR not opened". Plan ops (`missingPrDocs` in join/change/upgrade) are unchanged.

**`merge-back <spec> [--push]`** (`T/commands/merge-back.ts`, logic and render in `T/publish/merge-back.ts`, an outcome
union like `T/publish/sync-main.ts`). Run by a worker in its lane tree. Outside spec-branch mode it refuses:
`merge-back: <spec> has no spec branch`. The current branch must be a group of the layout read at base (record), and
not ship-alone, else `merge-back: <branch> is not a lane of <spec>; push your phase from your lane's tree`.
- *no flag*: fetch `feat/<spec>` and `<default>`. Merge `origin/feat/<spec>` into the tree, then `origin/<default>`
  (each `git merge --no-edit`, skipped when already contained).
  - Both already held: `<branch> already holds feat/<spec> and <default> · merge-back <spec> --push`.
  - Clean: `Merged feat/<spec> (+N) and <default> (+M) into <branch> · run the after-merge-main and per-commit
    gates, commit, then merge-back <spec> --push`. The after-merge-main gate is named only when main came in.
  - Conflict: the merge is left in progress:
    `merge-back: <branch> conflicts with <feat/<spec>|<default>> in <paths>; resolve it here, commit, then merge-back <spec> --push`.
- `--push`: refuses a dirty tree or a merge in progress.
  1. `pushBranch` the lane to its own name.
  2. `git push origin HEAD:refs/heads/feat/<spec>` (never forced, no pre-check). A non-fast-forward rejection
     prints `merge-back: feat/<spec> moved; run merge-back <spec> again`.
  3. Then `publishDocs` (`T/publish/publish.ts`) runs unchanged in the lane. It snapshots, lands on main, and merges
     the snapshot into HEAD.
  4. Then the snapshot merge goes to `feat/<spec>`: a fast-forward push. If the spec branch moved meanwhile, the
     docs-only snapshot is merged onto its new tip off-checkout (`mergeCommit`, first parent the spec tip) and
     lease-pushed, two attempts like `publishDocs` (`T/publish/publish.ts:29-35`).
  - Result: `Merged back: <branch> → feat/<spec> (+N) · docs published to main`. A docs refusal prints after the
    push line, never undoes the push, and the next `--push` retries it, since `publishDocs` snapshots everything
    since the last published snapshot.

`mergeCommit(git, { first, second, message, conflict })` is extracted from `T/publish/sync-main.ts:56-62` and
`T/publish/publish.ts:45-48`, with their messages passed in verbatim. Main reaches the spec branch only through lanes:
gated, and with any conflict resolved in a tree. The final-PR babysitter merges main once every lane is done.

**Unplanned branches.** `merge-back` refuses a non-lane branch (above). In spec-branch mode `pr open` refuses a head
that is neither `feat/<spec>` nor a ship-alone group: `pr open: <spec> ships from feat/<spec>; <branch> is a lane, its
work reaches the PR through merge-back`. `publish-docs` and `push` refuse in a lane tree in spec-branch mode:
`<command>: <branch> is a lane of <spec>; use merge-back <spec> --push`.

## Phase 4 — close-out and prune on the spec branch

**Handoff subject.** `handoff.md` §3: `[handoff] <spec> phase <id>: <summary>`, so commits name their phase.

Close-out (`T/crew/close-out-run.ts:37-80`) in spec-branch mode, for a lane worker:
- pushed = lane HEAD is an ancestor of `origin/feat/<spec>`. A plain HEAD == `origin/<lane>` test would fail after
  the docs snapshot merge moves the lane past its pushed name. On failure:
  `commits not merged back → merge-back <spec> --push`.
- handoff = a `[handoff] <spec> phase <id>` commit since launch that is reachable from `origin/<lane>` and from
  `origin/feat/<spec>`. Another lane's handoff never counts. `--since` stays ISO.
- Crew line: the last turn, else the body of that `[handoff]` commit (this ends the CRM false alarm).

Extraction: an optional layout/branch on `CloseOutWorld`; `claimKey` maps a `<spec> babysit default` title to
`<spec>#pr-default`.

Prune (`T/trees/prune-rules.ts:24-31`): a lane tree also counts as merged when its tip is an ancestor of
`origin/feat/<spec>` and its lane has no open phase. The spec branch's own tree prunes as today, by its merged PR's
head (`gotcha-squash-merged-branch-is-not-an-ancestor`). The layout is passed in, so the rule stays pure.

## Phase 5 — the final PR and ship-alone groups

- **Opening it.** The final PR is group `default`: `pr open <spec> default`, or `pr open <spec>` with no group in
  spec-branch mode. Head `feat/<spec>`, base default; title `<spec>` plus phases; the body lists every phase outside
  ship-alone groups with its Outcome. Code: `T/pr/actions/open.ts:44,97-106`, `T/pr/resolve.ts:59-69` (no group named
  resolves to `default` in this mode).
- **PR document** (board on): the `default` document is matched by branch (`T/plan/docs/pr-doc.ts`,
  `T/plan/pr-sync.ts:54-74`). Ship-alone groups keep theirs. Lane documents stay `not-opened` and are never shown
  (Phase 3).
- **How to review** (`pr hold --how-to-review`): one section per phase with its Outcome, its files to touch, and its
  commits from `git log --format='%h %s' origin/<default>..feat/<spec> --grep "^\[handoff\] <spec> phase <id>"` and
  the commits of that handoff's lane.
- **Babysit.** `launch babysit <spec> default` places (or takes over) a tree on `feat/<spec>`. Its claim is the
  existing `pr-default` (`T/claims/pr-claim.ts`). `takeRefusal` (`T/claims/rules.ts:48-57`) accepts group `default` in
  spec-branch mode. The no-group refusals in `T/launch/command-line.ts:39`, `T/commands/crew/launch.ts:30`,
  `launch-session.ts:50,67` and `close-out-run.ts:43` now see a group, so they stay as they are. When behind, it
  merges `origin/<base>` (= default), as today, and is then the only writer of main into the spec branch. It fixes
  review comments in its own tree; there is no group's last phase to relaunch.
- **Merge.** `pr merge` of the `default` PR clears `spec-branch:` and `ship-alone:`.
- **Ship-alone groups.** Unchanged: a per-group PR moment from a tree cut from main. Their code reaches the spec
  branch the next time a lane merges main.

## Phase 6 — the overseer runs a spec end to end

- **`oversee-crew.md`** gets a *One spec* section:
  - Start: `crew overseer --spec`, `ready <spec> --order`, regroup and split with `phase set|split`, pick
    `ship-alone:`, list each under *Say if wrong*, then `crew start --spec`.
  - Ticks run with `--spec`.
  - The PR moment comes when every code phase outside the ship-alone groups is done: `pr open <spec> default`, then a
    babysitter in ship mode (hold-for-review: *How to review* per phase).
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
  - `specLayout` and `shipAloneSuggestions` (mixed spec refused; frozen ship-alone; no-group spec has no mode);
  - `scopeWorld`;
  - `groupKey` agreeing for `pickRows` and the tick's `busy`;
  - `buildOrder` (linear, declared edges, ranges, cross-spec, task phases, cycle, same-files pair);
  - `machineWorkers` states.
- **Real git only for:**
  - the `addTree` base;
  - `publish-merge-back.git.test.ts` (new; `REAL_GIT_CAP` +1 in the same diff; repos built in `beforeAll`). Cases:
    clean, already holds, main merged in, conflict left in progress, moved on push, snapshot pushed after a move,
    docs refusal after push;
  - the close-out read.
- **Fast `CrewDeps` builder on `gitStub`:** build it only if fast-tests phase 8 hasn't landed it.
