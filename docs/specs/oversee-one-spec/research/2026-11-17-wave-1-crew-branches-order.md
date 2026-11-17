---
date: 2026-11-17
wave: 1
lens: implementation
slug: crew-branches-order
brief: product-brief.md
---

# Recon Wave 1 — crew-branches-order

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Paths relative to `skills/spec/` (T = `skills/spec/tools`).

## Verified

### Crew state and the one-overseer lock
- Run file: one per clone. `T/crew/deps.ts:38-53` `runFileStore(projectDir, runner)` → `<git-common-dir>/spec-board/crew/run.md` (`T/core/git.ts:66-73`). No spec field in `RunFile` (`T/crew/run-state.ts:29-37`) or `newRunFile` (:67-70).
- `runFileStore` callers (all change if it takes a spec): `T/commands/crew/overseer.ts:23,53`, `tick.ts:54`, `launch.ts:15`, `check.ts:14`. `crew wait` takes ids only.
- Lock = the `overseer:` id inside that file. `whoseRun` (`T/crew/overseer.ts:11-20`) needs no spec input; `crew start` refuses on `other` (`T/commands/crew/overseer.ts:25-27`), tick returns early (`tick.ts:64-65`).
- Briefs already keyed by spec: `briefs/<spec>#<phase|pr-group>.md` (`T/commands/crew/launch-session.ts:66-69`).
- No file locking: `launch-session.ts:61-62` and `tick.ts:57-73` read-modify-write `run.md`.
- `oversee-crew` "takes no spec" is prose only (`SKILL.md:4,56,73,89`, `oversee-crew.md:6`); `T/context/request.ts:9,17-24` would parse a name; launch refuses it (`T/launch/command-line.ts:35-37`, test `tests/launch.test.ts:127`).

### Caps
- Settings `crew: { workers, babysitters, selfApprove }` per repo (`T/playbook/settings.ts:21,33,55,66,149-155`); defaults 3/2 (`run-state.ts:10`).
- Worker cap enforced only in `fillSlots` (`tick.ts:117-141`): counts this run's `## Launched` execute entries. `crew launch` checks no cap. Babysitter cap is prose only (`oversee-crew.md:143`).
- Machine-wide view exists: `T/sessions/agents.ts:27-31` `loadAgents` runs `claude agents --json --all` (every repo); titles `<spec> execute <phase>` parse with `T/launch/title.ts:19-25`.

### One worker per spec — blocked twice
- `T/crew/pick.ts:22-38` `pickRows`: `taken.has(row.spec)` skip (:30,34); `busy` built from this run's workers (`tick.ts:124`). Tests pin it: `tests/crew-tick-step.test.ts:71,76`, `tests/crew-tick.git.test.ts:98`.
- One tree per PR group: `T/trees/naming.ts:6-10` `feat/<spec>-pr-<group>`; `treeHolder` busy (`T/trees/find.ts:55-63`); board `treeBusy` (`T/board/lanes.ts:164-172`), skipped by pick (`pick.ts:30`). Two phases of one PR group never run at once.

### Tick's world
- `tick.ts:143-153` loads the whole board (`loadBoardInputs`, `buildBoard` without `me`); ready rows carry `.spec`, so a spec filter before `pickRows` is one line. Questions printed are whole-record (`tick.ts:82-84`).

### Branches, trees, push, PRs
- Branch base hard-coded to the default branch: `T/trees/acquire.ts:24-28` (`pinDefault(origin/<default>)`); reuse local (:18-19), take over origin (:21-22).
- `feat/<spec>` already means "a spec whose phases have no `pr:`" (`naming.ts:7-10`, `T/plan/docs/pr-doc.ts:11-12,54-56`, `T/pr/groups.ts:4`). `specOfBranch` regex `^feat\/(.+?)(?:-pr-[a-z0-9]+)?$` (`naming.ts:12-16`): any other suffix reads as a different spec.
- `findTree` fallback (`T/trees/find.ts:32-39,103-112`) can return a tree on another group's branch; nothing checks a tree's base matches its group. Take-over "build on that branch" (`execute.md:54`, `T/commands/claim.ts:126-131`). Likely path for #1295 (a group branch cut from another group's).
- `pushBranch` (`T/publish/push.ts:45-68`): pushes to own name, no force, no retry; ahead/behind measured against `origin/<default>` (:53,65).
- `publish-docs` (`T/publish/publish.ts:29-57`, `T/publish/snapshot.ts:45-64`): snapshots spec-doc changes since merge-base with main or newest snapshot commit, 3-way merge onto main, refuses `diverged on main in <paths>`. On a branch fed by several group trees that each published, the base is older than those publishes → the `code-map.md` refusal seen in CRM (inferred).
- `pr open` base is always default (`T/pr/actions/open.ts:100`, `gh-writes.ts:57-58`); resolve by `feat/<spec>-pr-<group>` (`T/pr/resolve.ts:59-69`); merge line lands per group (`T/pr/actions/merge.ts:76-100`); PR docs per group (`T/plan/docs/pr-doc.ts:15-66`, `T/plan/pr-sync.ts:54-74`).
- Babysit: one per group, claim `pr-<group>`, merges `origin/<default>` (`babysit.md:3-7,39-45,55,72-83`); `pr wait` checks branch == headRefName (`T/pr/babysit/wait.ts:77-82`).
- Close-out "pushed" = `HEAD == origin/<branch>` of claim/current branch (`T/crew/close-out-run.ts:47,70-75`); handoff grep on `origin/<branch>` (:77-80). A tree on a shared branch fails `pushed` once another worker pushes.
- Prune: merged = HEAD in `origin/<default>` or a merged PR's head (`T/trees/prune-rules.ts:24-31`); trees folded into an integration branch never qualify.
- `join --tidy` holds back files any `feat/<spec>*` branch changes (`T/plan/tidy-holders.ts:47-60`).

### Deploy / ship alone
- `deploy: { paths, gate }` parsed (`T/playbook/settings.ts:39-43,132-138`); matching PR files against it is prose only (`babysit.md:117-124`, `oversee-crew.md:143-145`). No per-group ship-alone flag. `needs-deployed` waits exist (`T/board/deploy-waits.ts:10-19`); `phase deployed --land`.

### Build order
- `spec.ts ready` (`T/commands/ready.ts:7-15`): ready set + PR groups; no waves, no critical path. `readySet` (`T/ready/ready-set.ts:16-27`), `phaseNeeds` (:40-42), `sameFilesWaits` (:67-74). `needsCycle` (`T/core/phase-edges.ts:36-50`) is the only graph walk. `unblockCounts` (`T/board/rank.ts:22-35`).
- ★ is spec-level: `markSafe` (`T/board/rank.ts:37-54`) compares whole-spec `code-map.md` paths (`T/graph/overlap.ts:15-23`). No per-phase file data: `PhaseState` (`T/core/spec-state.ts:14-29`) and `PhaseDoc` have none; "Files to touch" is unparsed template prose (`T/phases/template.ts:47-48`). `codeMapForPhase` (`T/context/code-map.ts:8-16`) is a substring guess.
- Writers that apply choices exist and validate edges/cycles: `phase set|split|move|add` (`T/phases/*`, `T/plan/ops/change.ts:34-48`).

### Ownership signal
- No spec-level claim. Claims are `spec#phase` and `spec#pr-<group>` (`T/claims/store.ts:9-38`, `T/claims/pr-claim.ts:1-15`); remote refs `refs/spec-claims/<spec>/<phase>` work with the board record off (`T/claims/remote.ts:22-41`).
- `session register overseer <spec>` exists (`T/commands/session.ts:16-52`) but needs the record (`T/plan/board-base.ts:19`); no mode doc calls it for an overseer. `withStamp` re-stamps a session's spec to whatever spec its write touches (`T/sessions/stamp.ts:55-70`).
- Phase writers consult no claim/session/run file. One choke point: `phaseWriterFor` (`T/plan/phase-writer.ts:55-66`, already returns a `refusingWriter` for local-pilot).
- Plan-changed hook fires on Write/Edit only, never on `spec.ts phase` Bash writes, and tells the reader afterwards (`T/hooks/plan-changed.ts:25-52`).

## Reuse
- `whoseRun`/`overseerLine`, run-file section writers, brief naming, `loadAgents`+`parseLaunchTitle` for a machine-wide count, every other `pickRows` filter.
- `landOnRef` lease-push-retry loop (`T/core/land-on-ref.ts:42-67`); off-checkout merge via `merge-tree`+`commit-tree` (`T/publish/sync-main.ts:56-62`); `addTree` given a non-default base; `pr open` branch guard; `gh pr create --base`.
- `readySet`, `phaseNeeds`, `resolvePhaseRef`, `unblockCounts`, `renderPrGroups`, `same-files-as`; `phase set|split|move` to apply regroupings; claim refs as a record-independent signal; `phaseWriterFor` refusal slot.

## Still open
1. **Per-phase collision data.** Nothing per phase lists files. Is "Files to touch" written consistently enough in real phase files (CRM, plugin) to parse, or must the overseer judge from code-map + prose?
2. **Tree and branch shape for parallel phases in one spec.** One tree per phase? A naming scheme `specOfBranch`, infer-spec, board render and prune all read correctly, that doesn't collide with `feat/<spec>`. Every `specOfBranch` caller.
3. **What the CRM run actually did** on `feat/migration-reconciliation-rules-engine`: how workers merged in / pushed back, which close-out checks false-alarmed, how #1295's branch got its base, how publish-docs behaved. Real evidence for the merge-back step.
4. **Spec-level overseer marker without the record.** Can the claim store and remote refs carry a non-phase key (`<spec>#overseer`, precedent `pr-<group>`) and can `phaseWriterFor` read it to name the overseer?

## Neighbors
- `oversee-crew-spec` (open, only phase 6 CRM adoption left): built the whole-board overseer; this spec adds a spec-scoped mode beside it → `related`.
- `pr-babysit` (open, only phase 8 task left): owns babysit and `pr open`; this spec changes PR base/group routing → `related`.
- `live-board` (draft, phase 11 left, task-level): touches `phase-writer.ts`, `push.ts`, `ready-set.ts` → `related`, no ownership split.
- `owner-split`, `spec-board`, `self-driving-loop`: finished; no relation needed.
