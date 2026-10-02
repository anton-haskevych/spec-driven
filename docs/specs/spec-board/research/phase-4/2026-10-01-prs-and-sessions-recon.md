# Phase 4 recon — PRs and sessions (whole phase, one chunk)

One wave of 2 explorers plus live probes on CRM (gh 2.93.0, CLI 2.1.287). Paths relative to
`skills/spec/tools/`.

## The seam

- **Model slots exist, nothing fills them.** `board/model.ts:13-33` has `SessionCell`, `PrCell`,
  `FlightRow.session?/pr?`, `FlightNext` with `fix CI`/`merge`; `Board.footer.prs?/sessions?` at :78-79.
  `board/render.ts:50` already renders `sessionCell`/`prCell`; `:98-99` already prints the
  `PRs unavailable` / `sessions unavailable` footer lines. `board/cells.ts:61-73` formats both cells.
- **`next`** comes from `board/flight.ts:31` (`ticked on branch, not merged` | `executing`).
- **`needsYou`** is `board/attention.ts:8` (overdue + deploy), called at `board/lanes.ts:55`. Footer
  built at `lanes.ts:57` without `prs`/`sessions`.
- **Composition** `board/load.ts:31-54`: defaultBranch → `loadMainline` (await) → `scanWorkspaces`
  (await, needs `base.sha`). `settings` is returned by `loadMainline` but dropped at :37.
  `--local` only reaches mainline today.
- **gh** `pr/gh.ts:21-48`: `ghClient(cwd, Runner)` is **sync**, no timeout, ignores exit code, parses
  stdout. `GhClient` is a full literal in `tests/pr-main-compare.test.ts:7-29`.
- **Checks** `pr/checks.ts:13` `summarizeChecks(Check[], externalPatterns)`; `Check` is
  `{ name, bucket, workflow, link }` (`pr/types.ts:4`). `toBucket` (`pr/gh-records.ts:60`) maps unknown
  to pending.
- **PR links** `pr/resolve.ts:17` `specPrNumbers(prOpening)` already parses `## Spec state`
  (`PR #n`, `/pull/n`). Base cache holds `pr-opening.md` (`docs/specs/*/*.md` read set).
- **Workspaces** carry `branch?` (`workspaces/list.ts:5-13`) and are realpath'd (`list.ts:20-26`,
  comment already names session cwds).
- **Timeouts** `core/run.ts:7-12` `RunOptions.timeoutMs`, honored by both `systemRunner` and
  `systemAsyncRunner` (stderr `timed out after N ms`).

## Reuse

- `summarizeChecks` for counts and external globs, `specPrNumbers` for links, `Result`
  (`core/result.ts:1`), `createTree` for a fake claude home, `stubRunner`/`asyncStubRunner`.
- `board-factories.ts` `flightRow`, `boardInputs`, `workspaceView` (branch defaults to last segment).

## Probes

- **gh lists on CRM**: open with rollup 1.5 s (15 PRs), all states 0.6 s (100 PRs).
- **Rollup shape**: `CheckRun { name, status, conclusion, workflowName, detailsUrl, startedAt }`,
  `StatusContext { context, state, targetUrl, startedAt }`. Seen: CheckRun COMPLETED with
  SUCCESS/FAILURE/SKIPPED; StatusContext SUCCESS/PENDING.
- **gh dedupe is by name *and* workflow**, not name alone: PR 566 has two "Timing Summary" runs (E2E
  Tests, Monorepo CI); `gh pr checks` lists both (29 = 29). Per-name dedupe would give 28.
- **Session files** `~/.claude/sessions/<pid>.json` (+ `<pid>.<hash>.key` siblings — glob `*.json`):
  `startedAt`/`updatedAt` epoch ms; `procStart` ctime-style **in UTC** (`Thu Oct  1 22:53:33 2026`).
- **`ps -o pid=,lstart= -p …` prints local time**; `TZ=UTC ps …` matches `procStart` exactly. Rows come
  back out of pid order, right-aligned pid, trailing spaces; missing pids omitted; exit 1 when none
  exist.

## Testing-issue estimate

- **Sync gh vs concurrent scan**: `Bun.spawnSync` blocks the loop, so the two list calls can only
  overlap the scan through `AsyncRunner`. Needs an async lister, not new methods on sync `GhClient`.
- **No rollup fixture** yet; capture from CRM (PR 566 for the name+workflow case) plus `gh pr checks`
  output of the same PR for a real parity test. The failed-then-passed re-run case is not in the data:
  hand-make it.
- **Sizes**: `board/lanes.ts` 150, `render.ts` 101 — room. New logic goes to new files
  (`board/joins.ts`, `sessions/live.ts`, `pr/gh-lists.ts`).
- **Purity**: session reading takes `claudeHome` and a `procStarts` function; `ps` lives in its own
  adapter. Joins and attention stay pure over `BoardInputs` + rows.
- `PrCell` can't express "gh failed" (`?` with no number) or a merged PR; needs a small model change.
