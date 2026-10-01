# Phase 4 preflight — PRs and sessions

Inputs: `phases/phase-4-prs-and-sessions.md`, `research/phase-4/2026-10-01-prs-and-sessions-recon.md`,
`skills/spec/principles.md`. Paths relative to `skills/spec/tools/`.

## Findings that change the plan

1. **"`GhClient.openPrs` / `recentPrs`" can't meet the timing decision.** `ghClient` is sync over
   `Runner` (`pr/gh.ts:21,30`); `Bun.spawnSync` blocks the loop, so the lists could not overlap the
   async worktree scan (`board/load.ts:38`) that `decision-board-timing-accepted.md` requires. Adding
   members to `GhClient` also breaks the full literal in `tests/pr-main-compare.test.ts:7-29` for no
   gain.
2. **"Latest run per name" is not gh's rule.** gh 2.93 keeps one run per *name + workflow*: CRM PR 566
   has two "Timing Summary" checks from two workflows and `gh pr checks` lists both (recon). Per-name
   dedupe would drop one and break parity on real data.
3. **`procStart` is UTC; `ps -o lstart=` prints local time** (recon probe). A plain comparison marks
   every session dead → every claim `closed` in phase 5. `ps` must run with `TZ=UTC`.
4. **Tests would touch the real machine.** `tests/board-command.test.ts:48` runs `listCommand` without
   `--local`; once phase 4 lands that spawns real `gh` and reads the real `~/.claude/sessions`.
   `BoardDeps` (`commands/board.ts:8`) must carry `claudeHome`, and that test must stub `gh`.
5. **`PrCell` can't express the planned states.** No "gh failed" (`?` with no number), no merged/closed,
   and `prCell` prints `✓` for zero failing + zero pending even with zero checks (`board/cells.ts:72`),
   which contradicts the merge rule's "≥ 1 check".

## Clean Code

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names | Bites | `GhLists` / `ghLists` (lists, async) beside `GhClient`; `checkBucket(state)` names gh's mapping |
| Small functions, one thing | Bites | `rollupToChecks` = `toRollupItems` → `latestPerCheck` → map; each under 50 lines |
| No flag args | Inert | — |
| Errors as values | Bites | gh and sessions return `Result`; board keeps rendering with `?` / `unknown` |
| Boundaries (wrap 3rd party) | Bites | `sessions/live.ts` is the only reader of the session JSON; `ps` in `sessions/proc-starts.ts` |
| Tests F.I.R.S.T | Violated, fix here | Finding 4: inject `claudeHome`, stub gh in `board-command.test.ts` |

## Clean Architecture

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | `board/joins.ts` imports `PrRow` / `LiveSession` types only, never `gh-lists` or `live` |
| Plain data across boundaries | Bites | `BoardInputs` gains `prs`, `sessions`, `prLinks` as plain data (`board/inputs.ts:23`) |
| Humble object | Bites | `ps` and `gh` adapters are thin; parsing (`parseProcStarts`, `toOpenPrs`) is pure and tested |
| ADP (no cycles) | Bites | `pr/types.ts` holds `PrRow`; `board/inputs.ts` imports it (types only, `decision-board-inputs-types-apart-from-loader.md`) |

## SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | Two actors on `FlightRow.next`: workspace activity (`flight.ts:31`) and PR checks. Joins refine `next` after `flightRows`; `needsYou` reads the joined rows, so the merge/fix rule lives in one place |
| OCP | Bites | Phase 5 adds the claim join (`sessionId` first); `attachSessions` takes rows + sessions and stays open for a claims argument |
| LSP / ISP | Inert | — |
| DIP | Violated, fix here | Finding 1 and 4: lists via injected `AsyncRunner`; `claudeHome` + `procStarts` passed in |

## DDD

Skipped: tooling code, no domain aggregates. Ubiquitous language only: keep design's words
(`busy`/`idle`, `fix CI`, `merge`, `?`, `unknown`).

## Guard blindness

The planned parity test fed only `state` values from `tests/fixtures/gh-pr-checks.json` (`gh pr checks`
output). That checks the state→bucket switch but can't see the CheckRun `status`/`conclusion`
merge or the dedupe — finding 2 would pass it. Add a real pair from CRM: PR 566's
`statusCheckRollup` and its `gh pr checks` output, compared bucket by bucket.

## Seam deltas (beyond recon)

- `pr-opening.md` links live on the branch first in `docs: branch` projects; `prLinks` must union base
  and workspace views, not base alone.
- `cancel` bucket: counts as failing on the board (never mergeable, action is re-run = fix CI).

## Amendments

1. New `pr/gh-lists.ts`: `GhLists { openPrs(): Promise<Result<OpenPr[]>>; recentPrs(): Promise<Result<RecentPr[]>> }`,
   `ghLists(cwd, asyncRunner, timeoutMs)`. Fails on non-zero exit or unparseable stdout. `GhClient` is
   untouched.
2. `pr/rollup.ts`: `checkBucket(state)` + `rollupToChecks(rollup)`; dedupe key `name‖context` +
   `workflowName`, latest `startedAt` wins. `toPrRows(open, recent, external)` in the same file.
3. Fixtures: `gh-pr-list-open.json` (3 CRM PRs incl. 566), `gh-pr-checks-566.json` (parity),
   `gh-pr-list-all.json` (trimmed), hand-made re-run case inline in the test.
4. `sessions/live.ts` + `sessions/proc-starts.ts`; `ps` runs with `env.TZ = "UTC"`; whitespace-normalized
   compare; session `cwd` realpath'd.
5. `BoardDeps` / `BoardRunners` gain `claudeHome`; `--local` skips gh and sessions (`"local"` in inputs).
   `board-command.test.ts` routes `gh` to a stub.
6. Model: `PrCell` gains `passing?` and `state?: "merged" | "closed"`; `FlightRow.pr` may be
   `"unknown"`. `AttentionRow` gains `merge` and `fix` kinds.
7. Gh lists start before `loadMainline` and are awaited with the scan.

## Decisions for you

None.
