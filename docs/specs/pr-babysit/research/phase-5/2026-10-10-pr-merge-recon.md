# Phase 5 recon — `pr merge` and the merge line

One wave, read inline (the seam was already named by the phase entry and Stage B). Paths under `skills/spec/tools/`.

## Seam

- `focus/land.ts:26-58` — `landFocus` → `landAttempt`: `pinDefault` (fetches `origin <branch>`, `publish/snapshot.ts:20`) → `baseProject(git, tip)` (`mainline/load.ts:50`, spec docs at the tip in the shared `git archive` cache) → `findSpecs` → `planFocus(text)` → `hash-object -w` → `commitOnto(git, tip, indexInfo, message)` (`publish/commit-onto.ts`, scratch index) → `push origin <commit>:refs/heads/<branch>`; `NON_FAST_FORWARD` → retry once (ATTEMPTS = 2). Outcome `landed | refused | failed`. Only caller: `commands/focus.ts:40` (`focusLine` prints it).
- `pr/actions/gh-writes.ts` — `ghWrites(cwd, runner, budget)`: `call` checks exit code, `failureReason` reads `message` from a JSON body on stdout, else stderr first line. `merge` joins `create`/`ready`.
- `commands/pr.ts` — `ACTIONS` table; add `merge: { usage, run }`. Arg parsing mirrors `commands/pr/wait.ts` (`parseArgs`, positionals = target ≤ 2).
- `pr/resolve.ts:33` `resolvePr(gh, dir, target)` gives the `PrView` (`state`, `isDraft`, `headRefOid`, `headRefName`, `mergeCommit`, `checks`). `specPrNumbers` (`:20`) parses `PR #n` in `## Spec state` — the merge line must round-trip through it.
- Verdict: `pr/babysit/wait-step.ts:31` `waitStep(view, context, nowMs)` already turns a view into settle/waiting text (merged, closed, conflicting, red names, cancelled, none, pending summary) — reuse it for the "not green" refusal text instead of a second summariser.
- Settings: `loadSettings(projectDir).pr.merge` (`playbook/settings.ts:14`), `checks.external` → `externalMatcher` (`pr/checks/verdict.ts`). Read from the tree (ledger `gotcha-settings-read-from-the-working-tree`).
- Spec from a PR number: `trees/naming.ts` has only `treeName(spec, group)`; a number target needs the inverse (branch → spec).
- Babysit log: `pr/actions/open.ts:93-101` has a private `babysitLogger(git, now)`; merge is the second user.
- Default branch: `core/run.ts:87` `defaultBranch(cwd, runner)`.

## Reuse

- Lift `landAttempt` into `core/land-on-main.ts` taking a plan callback `(projectDir at tip) → write | refused | unchanged`; focus passes `planFocus`. `unchanged` serves the idempotent merge line (focus never returns it).
- `waitStep` for the green check; `babysitLogger` extracted into `pr/babysit/log.ts`.
- `pinDefault` inside landing is the `git fetch origin <default>` step — no separate fetch.

## Testing-issue estimate

- Real git needed for land-on-main and the merge flow: `tests/git-repo.ts` (`repoWithOrigin`, `clone`, `addWorktree`, `isolatedRunner`) + `routeGh(sequencedRunner, isolatedRunner)` (`tests/stub-runner.ts`) — exists, used by `focus-land.test.ts` and `pr-open.test.ts`.
- `focus-land.test.ts` covers retry, refused push, missing spec, unreachable origin — it is the refactor's safety net; port the generic cases to `land-on-main.test.ts`.
- Fixtures `gh-merge-{200,405,409}.json` missing; gh api failure shape: exit 1, JSON body on stdout, `gh: <message> (HTTP 409)` on stderr.
- Size: `gh-writes.ts` 60 lines, `open.ts` 101 — fine. Merge orchestration must stay < 250: keep the merge-line text edit pure in its own file (`pr/actions/merge-line.ts`).
- Already-merged path has no `mergedAt` in `PR_FIELDS`; the line's date is today (or `--date`) and the method is the resolved one when known.
