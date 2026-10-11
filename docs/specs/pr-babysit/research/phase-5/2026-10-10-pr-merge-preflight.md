# Phase 5 preflight — `pr merge` and the merge line

Inputs: `phases/phase-5-pr-merge.md`, `research/phase-5/2026-10-10-pr-merge-recon.md`, `principles.md`. Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **The separate fetch step is already inside landing.** The phase orders "merge → `git fetch origin <default>` → land". `pinDefault` (`publish/snapshot.ts:22-25`) runs `git fetch -q origin <branch>` and is the first thing `landAttempt` does (`focus/land.ts:35`). A second fetch is a duplicate; landing always runs (a branch that names no spec refuses inside the plan callback, after the fetch), so the fetch always happens.
2. **Focus has no "nothing to change" outcome; the merge line needs one.** `planFocus` refuses every no-op (`focus/plan.ts:25-29`), so `LandOutcome` is `landed | refused | failed` (`focus/land.ts:17-20`). Idempotent merge lines need `unchanged`; `focusLine` (`commands/focus.ts:43-49`) must then print it like a refusal or the type breaks.
3. **A second "is it green" summariser would duplicate `waitStep`.** `waitStep` (`pr/babysit/wait-step.ts:31-55`) already renders red names, cancelled, conflicting, pending and no-checks text. Reuse it with `startedMs = now` (inside the grace window `none` reads `no checks yet on <sha>` instead of a fake duration).
4. **A PR number target names no spec.** `trees/naming.ts:7` only builds `feat/<spec>-pr-<g>`; the merge line needs the inverse from `headRefName`. Put `specOfBranch` beside `treeName` (one owner of the naming rule).
5. **`babysitLogger` is private to `pr/actions/open.ts:93-101`.** Merge is its second user: move it to `pr/babysit/log.ts` (111 lines, room) with a test.

## Canon against phase 5

| Rule | Verdict | Consequence |
|---|---|---|
| SRP / one thing | Bites | `merge.ts` orchestrates; the text edit lives pure in `pr/actions/merge-line.ts`; landing in `core/land-on-main.ts` |
| Extract on second use | Bites | land-on-main (focus + merge), `babysitLogger` (open + merge), `waitStep` reused |
| Errors are values | Bites | `ghWrites.merge` returns `{merged:false,status,message}` on non-zero exit even with a JSON body (`gh-writes.ts:35-37` pattern) |
| DIP | Inert | runner/clock already injected (`OpenDeps`) |
| Clean Architecture / DDD | Inert | CLI tool, no domain layer |
| Size caps | Bites | `open.ts` 101, `gh-writes.ts` 60, `log.ts` 111 — fine; keep `merge.ts` < 150 by splitting the already-merged path into its own function |

## Guard blindness

`commands-table.test.ts` / `skill-wiring.test.ts` don't list `pr` verbs — nothing guards the new `ACTIONS` row; the `pr-merge` test drives `prCommand(["merge", …])` once so the row is covered.

## Seam and testability (delta from recon)

- gh api failures: exit 1, JSON body on stdout (`status` field as a string on current GitHub), `gh: <message> (HTTP 409)` on stderr — read status from body, else stderr.
- Draft PR: `waitStep` ignores drafts; GitHub's 405 "Pull Request is still a draft" passes through as the refusal. No extra branch.

## Amendments

1. `landOnMain<T>(git, branch, plan)`; plan returns `write | refused | unchanged`; outcome `landed{sha,landed} | unchanged|refused|failed{reason}`. Focus maps `unchanged` with refusals.
2. No explicit fetch in `merge.ts`; landing's pin is the fetch.
3. Not-green refusal = `pr merge: not green — <waitStep detail or waiting text>`.
4. `specOfBranch` in `trees/naming.ts`, tested against `treeName` round-trip.
5. Extract `babysitLogger` to `pr/babysit/log.ts` before merge uses it.

## Decisions for you

None.
