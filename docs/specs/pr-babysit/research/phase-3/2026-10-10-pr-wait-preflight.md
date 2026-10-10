# Phase 3 preflight — `pr wait` (2026-10-10)

## Findings that change the plan

1. **`pollUntil` is not new.** Phase file lists `pr/babysit/poll.ts (new)`; it landed in phase 4 (`pr/babysit/poll.ts:19`, `tests/pr-poll.test.ts`). Deliverable 1 is already met — tick it with that evidence.
2. **"Async runner" contradicts the house idiom.** Every pr module takes the sync `Runner` (`pr/gh.ts:23`, `pr/actions/open.ts` `OpenDeps.runner`) and tests use `sequencedRunner` (sync). `systemRunner` already honours `timeoutMs` (`core/run.ts:37`). Use the sync `Runner` + `GH_TIMEOUT_MS` (`pr/gh-lists.ts:5`).
3. **`ghClient` can't serve the wait.** Its 30-call budget (`pr/gh.ts:16`) runs out at poll 30 of ~50 (25 min / 30 s), and `call` passes no timeout. Wait reads with its own one-call `gh pr view` reusing `PR_FIELDS` (export it — one source) and `toPrView`.
4. **`waitStep(prev, …) → { events }` over-specifies.** Wait logs exactly `waiting` once and one settle; no transition events exist, so `prev` has no consumer. Signature: `waitStep(view, context, nowMs) → { settle } | { waiting: <description> }`; the description feeds the timeout line.
5. **Two missing view fields.** `PR_FIELDS` (`pr/gh.ts:18`) lacks `headRefName` (the `--sha` default needs "this tree's branch is the PR's") and `mergeCommit` (`merged as <sha>`); `toPrView` (`pr/gh-records.ts:13`) maps neither.

## Canon against the chunk

| Rule | Verdict | Consequence |
|---|---|---|
| Pure functions / Humble Object | Bites | `waitStep` pure in `pr/babysit/wait-step.ts`; `wait.ts` only reads gh, logs, loops |
| SRP (actors: CI verdict vs. wait policy vs. CLI) | Bites | verdict stays in `checks/verdict.ts`; stale/lag/grace policy in wait-step; argv/defaults in `commands/pr/wait.ts` |
| Single source of truth | Bites | export `PR_FIELDS`; reuse `checksVerdict`, `clockDuration`, `spanMs` |
| Errors are values | Bites | a failed poll read never settles; it becomes the waiting description (`gh: <reason>`) |
| DIP | Bites | clock, runner, `now` injected like `OpenDeps` |
| OCP / LSP / ISP | Inert | |
| Clean Architecture boundaries | Inert | CLI tool, one layer of adapters |
| DDD | Skipped | no domain model in scope |

## Guard blindness
None: no structural guards cover `pr/`.

## Seam deltas vs recon
None beyond the five findings. Files stay well under caps (`log.ts` 111 → ~112).

## Amendments

1. Tick deliverable 1 with `pr/babysit/poll.ts` (phase 4).
2. Sync `Runner`, `timeoutMs: GH_TIMEOUT_MS` per poll.
3. Export `PR_FIELDS` with `headRefName,mergeCommit` added; `PrView.headRefName: string`, `PrView.mergeCommit?: string`.
4. `waitStep(view, context, nowMs)`; `context = { sha?, since?, isExternal, startedMs }`.
5. Stale fail/cancel rows (`completedAt` < since) become `queued` before `checksVerdict`; the waiting description names them ("waiting on a newer run of X").
6. Both `none` reasons wait out a 3-min grace from the wait's start; `conflicting` settles at once (no workflows run on it).
7. Add `conflicting` to `EVENT_KINDS` and to technical.md's event list.

## Decisions for you
None.
