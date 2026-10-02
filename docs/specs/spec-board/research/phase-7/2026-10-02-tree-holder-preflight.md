---
date: 2026-10-02
phase: 7
chunk: tree-holder
---

# Phase 7 preflight — what holds a tree

*Source of record — do not edit.* Inputs: phase entry, `2026-10-02-tree-holder-recon.md`, `principles.md`.

## Findings that change the plan

1. **"Every caller gets the same answer" is wrong: prune asks a different question.** `trees/prune.ts:70`
   decides whether a tree may be *deleted*; `trees/place.ts:56` and `board/tree-target.ts:28` decide whether
   it may be *worked in*. An idle, handed-off tab (CRM 10-02: the PR A session still ran the local stack from
   its merged tree) must stop placement from refusing, but must still stop prune from deleting the folder under
   it. Two functions: `treeOccupant` (anyone present: prune) and `treeHolder` (anyone working: place, launch,
   board).
2. **The board can't see uncommitted changes, so it can't apply the dirty clause.** The scan keeps only
   spec-root status reduced to spec names (`workspaces/changes.ts:38-52`, `scan.ts:8-11`); a full status in
   every tree costs ~9 s on CRM (project ledger `gotcha-clean-check-across-worktrees-stats-every-file.md`).
   `treeHolder` takes the dirty check as an optional lazy input: place passes one status on the one found
   tree, run only when an idle claim-free session is in it; the board passes none, so its ready rows are
   advisory and place stays the gate.
3. **The board never excludes its caller** (`tree-target.ts:28` passes no own id; `BoardInputs`
   `inputs.ts:28-44` has none). Under `--local` (`load.ts:50`) the caller's own claim reads `unknown` and
   marks its own tree busy. Same call this phase rewrites: fix here. `BoardRequest` (`load.ts:23-25`)
   carries `ownSessionId`; `BoardInputs` passes it on.
4. **`find.ts:39` says unknown liveness blocks; `:43` lets it through.** Make each rule explicit:
   `treeOccupant` with unreadable sessions → occupied ("sessions can't be read"), so prune never deletes on
   a guess; `treeHolder` with unreadable sessions → claims alone decide (unknown claims still block, `:27`).
5. **The holder string carries no reason, and the name `Holder` is taken.** `after <name>` (`find.ts:45`)
   reads as ordering, not occupancy, and `claims/remote-payload.ts` already exports `Holder` (user@host).
   New `TreeHolder { who, doing }` rendered by one function; `Placement.holder` and `treeBusy` stay strings
   (no `BOARD_VERSION` change; recon: never bumped for text). `execute.md:40` matches the literal and must
   change with it.

## Clean Code against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Intention-revealing names | Violated, fix here | `busyHolder` serves two meanings; split into `treeOccupant` / `treeHolder` |
| Functions do one thing | Bites | `treeHolder` decides; `describeHolder` renders; the status call lives in `trees/uncommitted.ts` |
| No flag arguments | Bites | Dirty input is a lazy function (`hasUncommittedChanges?: () => boolean`), not a boolean flag the board must fake |
| Comments | Violated, fix here | `find.ts:39` contradicts `:43` (finding 4) |
| Duplication | Violated, fix here | `env.CLAUDE_CODE_SESSION_ID || undefined` at `place.ts:56`, `prune.ts:66`, `claim.ts:51`; `claims/live.ts:22` without `|| undefined` (empty string ≠ undefined): one `ownSessionId(env)` helper |
| Tests F.I.R.S.T | Bites | Rule tests stay pure (`trees-find.test.ts` inline factories + status override); one real-repo test per place outcome |

## Clean Architecture against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | `trees/find.ts` stays pure; the status call is an adapter in `trees/uncommitted.ts` injected by `place.ts` |
| Policy vs detail | Bites | "held by work" is policy in `find.ts`; session files and status output are details |
| Component cohesion | Violated, out of scope | `Env` lives in `launch/terminal.ts:5` but is imported by `claims/live.ts`, `trees/place.ts`, `commands/claim.ts`. Moved to `core/env.ts` with the helper, since the helper needs it (in scope) |

## SOLID against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Violated, fix here | Two actors (prune deletes, place assigns) shared one rule: finding 1 |
| OCP | Bites | Next variant: a session waiting on a permission prompt. `doing` is a closed union; add a member then |
| LSP / ISP | Inert | |
| DIP | Bites | `treeHolder` depends on a function, not on `Runner` |

## DDD against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Ubiquitous language | Bites | "holds a tree" (work) vs "is in a tree" (presence); copy says "mid-task here", "left uncommitted changes here" |
| Invariant ownership | Bites | One tree, one worker: placement enforces it; claims stay the lock for a phase |

## Testing deltas vs recon

- Recon missed: `board-command.test.ts` builds `BoardDeps` directly (`claudeHome` sites in 6 test files);
  adding `env` to `BoardDeps` touches each. Keep `env` required and fix them; a default would hide a missing
  caller id in production.
- Launcher-successor race: the launching session is still mid-turn for a few seconds after `launch`
  returns. The new session needs ~10 s to boot and place, so it normally finds the launcher idle. If it
  doesn't, the refusal names "mid-task" and the reason is visible. Accepted; no code.

## Amendments

1. Phase entry: deliverable 2 reads "place and launch apply the work rule; the board applies it without the
   dirty check (advisory); prune keeps the presence rule, and unreadable sessions keep a tree".
2. Add `core/env.ts` (`Env`, moved from `launch/terminal.ts`) and `sessions/own.ts` `ownSessionId(env)`; replace the
   four reads. Its own refactor commit, first.
3. `trees/find.ts`: `treeOccupant(...)` (old rule + unreadable sessions → occupied) and `treeHolder(...)`
   returning `TreeHolder | undefined`; `describeHolder` renders `after <spec> <phase> (<who>)`,
   `<who> is mid-task here`, `<who> left uncommitted changes here`.
4. `trees/uncommitted.ts`: `hasUncommittedChanges(path, runner)`, one `--no-optional-locks status --porcelain
   -z --untracked-files=normal`; a failed status counts as uncommitted (fail toward refusing).
5. Board: `BoardRequest.ownSessionId`, `BoardInputs.ownSessionId`; `BoardDeps.env`; `tree-target.ts` uses
   `treeHolder` with the caller's id.
6. Docs: `execute.md:40`, SKILL.md *Tools* → Trees and *Next sessions*, README, design row 18, trees decision.

## Decisions for you

None.
