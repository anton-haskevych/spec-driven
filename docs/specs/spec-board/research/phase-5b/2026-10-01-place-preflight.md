# Phase 5b — `trees place` + setup + personal layer: preflight

Inputs: `phases/phase-5b-tree-placement.md`, `research/phase-5b/2026-10-01-place-recon.md`, `principles.md`.
Paths relative to `skills/spec/tools/` unless noted.

## Findings that change the plan

1. **The branch name is wrong.** The phase says `feat/<spec>-<pr>` (`B` → `feat/spec-board-b`). Real PR-group
   branches are `feat/<spec>-pr-<group>`: this tree is `feat/spec-board-pr-b`; CRM has
   `feat/alert-noise-cleanup-pr-a`, `feat/double-charge-proof-checkout-pr-1|2`; `design.md:68` and
   `technical.md:148` show `alert-noise-cleanup-pr-d`. Using the phase's name would miss every existing tree and
   cut a duplicate branch. → branch `feat/<spec>-pr-<group>`, folder `<spec>-pr-<group>`; no `pr:` → `feat/<spec>`.
2. **`gates.bootstrap` can't be run by a tool.** `playbook/gates.ts:8` parses `- [ ]` checklist text; nothing
   executes it. `execute.md` §1 *Fresh worktree?* already has the session work through it. → `place` copies the
   include files and reports `fresh` + the gate name; the session runs the gate (it already does). A copy failure
   names the file and keeps the tree.
3. **A local branch with no tree is unhandled.** Find → remote → create skips `feat/x` existing locally but not
   checked out (a removed tree). Creating would fail (`-b` on an existing branch); re-cutting would drop unpushed
   commits. → after find, check `refs/heads/<branch>` and add the tree on it.
4. **Remote claims belong to `claim take`.** `commands/claim.ts:93-114` (`mirrorTake`) already refuses a live
   remote claim. Checking it in `place` too duplicates the rule (principles §8). → `place` refuses only on local
   busy (live session cwd, live/unknown local claim); `claim take` stays the remote gate.
5. **Second and third uses to extract.** The deepest-prefix session owner (`board/joins.ts:42`,
   `sessionsByWorkspace`, private) gets its second use; `git rev-parse --path-format=absolute --git-common-dir`
   gets its third (`claims/store.ts:33`, `mainline/load.ts:46`). → `workspaces/owner.ts` `ownerOf(cwd, paths)`
   and `core/git.ts` `gitCommonDir(git)`, each with a test, before `place`.

## Clean Code against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Small functions / one thing | Bites | `place` = find → busy → acquire (local branch / remote / create) → setup; each its own function, orchestrator under 50 lines |
| No flag arguments | Bites | `--json` is a render choice in `commands/trees.ts`, not a `place` parameter |
| Errors as values | Bites | `Result<Placement>`; refusal is a value with `reason`, never a throw (mirror `TakeOutcome`, `claims/store.ts:21`) |
| Names | Bites | `treeBranch` / `treeFolder` (pure), `detectTreeRoot`, `copyIncludedFiles`, `placeTree` |
| Comments | Inert | — |

## Clean Architecture against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Humble object at IO edge | Bites | Pure: naming, root detection from `Workspace[]`, find-by-branch/scan, busy. IO: git calls, file copy, `local.md` write |
| Plain data across boundaries | Bites | `place` takes `Workspace[]`, `WorkspaceView[]`, `HeldClaim[]`, `Result<LiveSession[]>` — all existing types |
| Dependency direction | Bites | `trees/` imports `workspaces/`, `claims/`, `sessions/`, `board/activity`; nothing imports `trees/` except `commands/trees.ts` |
| Component cycles | Inert | `board/load.ts` already depends on these; `trees` sits above |

## SOLID against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP (actors) | Bites | Personal settings (the person) and placement rules (the project) change for different reasons → `trees/local-settings.ts` apart from `trees/place.ts` |
| DIP | Bites | Deps injected like `ClaimDeps` (`commands/claim.ts:27`): `runner`, `asyncRunner`, `claudeHome`, `env`, plus `home` (HOME is never stubbed in tests) |
| OCP / LSP / ISP | Inert | — |

Pass D (DDD): skipped — tooling, no domain model beyond names already in the ubiquitous language (tree, PR group, claim).

## Guard blindness

None claimed. The doctor does not check `local.md` and shouldn't (it's personal, inside `.git`).

## Seam and testability (deltas from recon)

- `commands/claim.ts` 215 lines: untouched. `board/joins.ts` loses `sessionsByWorkspace` (shrinks).
- Remote-only branch fixture: `repo.clone("other")`, branch, push; then `place` from `repo.dir`.
- `ps` stub + `createTree` claude home cover busy (pattern `tests/claim-command.test.ts:16-30`).

## Amendments

1. Branch `feat/<spec>-pr-<group lowercased>`, folder `<spec>-pr-<group>`; no `pr:` → `feat/<spec>` / `<spec>`.
   Fix the phase entry and `decision-trees-placed-by-spec-driven.md`.
2. Order: find by branch → scan (claims for the spec's same-group phases first, then `phaseActivity`) → local
   branch without a tree → `origin/<branch>` → create from fresh `origin/<default>` (offline: last fetched
   `origin/<default>`, said in the output).
3. `place` never runs a gate. Output carries `fresh: true` and `bootstrap: <gate>` when settings name one.
4. The target folder exists but isn't this branch's tree → suffix `-2`, `-3` (never reuse, never delete).
5. Extract `ownerOf` and `gitCommonDir` first, each its own green commit.
6. `local.md` is written only when missing. Present without a valid `worktrees.root` → detect, don't overwrite,
   and the notice names the file.

## Decisions for you

None.
