# Phase 4 preflight — pr open (2026-10-10)

## Findings that change the plan

1. **The phase file asserts a `ready_for_review` run can be confirmed; `gh run list` can't name one.** Its fields (`event`, `status`, `conclusion`, …) carry `pull_request` for both `synchronize` and `ready_for_review`. Recon (`2026-10-10-gh-writes-recon.md`) → key on run ids: the ready run is a run for the head SHA that was not listed just before `gh pr ready`. The pre-ready wait (push runs registered) is what makes that sound.
2. **`GhClient.runJobs` is cached** (`pr/gh.ts:42`, third arg `true`). Reading a run's jobs during the race and again at the re-check returns the first answer. Read jobs once per new run, after the re-check; the re-check itself uses uncached `commitRuns`.
3. **`pushBranch` pushes whatever branch the tree is on** (`publish/push.ts:20-21`). `pr open billing B` from a tree on another branch would push that branch and then `gh pr create --head feat/billing-pr-b` fails or opens stale code. Refuse when the current branch is not `treeName(spec, group).branch`.
4. **`resolve.ts:33` uses `findSpecs` and takes the first match**; `resolveSpec` (`core/spec-folders.ts:46-52`) already refuses duplicates with a reason. Use it in resolve and open.
5. **Group tokens are case-sensitive in `pr:` frontmatter but the branch lowercases** (`trees/naming.ts:8`). Match the user's group case-insensitively, report the declared spelling.

## Clean Code against the plan

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions, one level of abstraction | Bites | `open.ts` orchestrates only; race logic in `ready-race.ts`, title/body in `pr-text.ts` |
| No flag arguments | Bites | `create` takes a `NewPr` record with `draft`, not a positional boolean |
| Errors as values | Bites | gh-writes returns `Result`; JSON error body on stdout with exit≠0 is a failure (use its `message`) |
| Comments | Inert | — |

## Clean Architecture / SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| Humble object at edges | Bites | `pollUntil` takes `{ now, sleep }`; `readyRace` takes `Pick<GhClient, "commitRuns" \| "runJobs">` + `GhWrites` so tests never spawn |
| ISP | Bites | the one hand fake (`tests/pr-main-compare.test.ts:13`) gains `commitRuns: unused`; race fakes implement only the Pick |
| DIP | Inert | no volatile concretes named in policy |
| OCP | Bites | `merge`/`rerunJob` join `GhWrites` in phases 5–6: one shared `call` keeps each new op to one line |

## DDD

Skipped: tooling, no domain model beyond "PR group", which `pr/groups.ts` names.

## Seam and testability (deltas from recon)

- `pr/resolve.ts` is 57 lines; branch lookup + groups keep it under 100.
- Fixtures: inline JSON strings are enough (`gh run list --json` rows); no new fixture files needed.

## Amendments

1. Ready run = new run id after `gh pr ready`; CI started iff some new run is not `cancelled` and its first job didn't conclude `skipped` (no jobs yet / queued = started).
2. Jobs read once per new run, after the one re-check poll.
3. `pr open` refuses when the tree's branch ≠ the group branch, before pushing.
4. `resolveSpec` in resolve and open.
5. Group match case-insensitive.
6. Title: one phase → `<spec>: <title>`; several → `<spec>: <first title> (+N more)`.

## Decisions for you

None.
