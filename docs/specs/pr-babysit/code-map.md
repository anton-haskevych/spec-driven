# Code Map — PR Babysit

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/pr/checks/verdict.ts` | `checksVerdict`, `externalMatcher` — the one green verdict | 1 |
| `skills/spec/tools/pr/check-table.ts` | `pr status` check table grouped by state | 1 |
| `skills/spec/tools/commands/pr.ts` | `pr` group `ACTIONS` table; verbs in `commands/pr/<verb>.ts` | 1 |
| `skills/spec/babysit.md` | the babysit procedure; execute §10 and handoff link it | 7 |
| `skills/spec/tools/claims/pr-claim.ts` | `pr-<group>` claim ids: `prClaimId`, `prClaimGroup`, `isPrGroup` | 7 |
| `skills/spec/tools/context/babysit-pack.ts` | babysit pack: the group's phases, settings, doctor | 7 |
| `skills/spec/tools/commands/pr/log.ts` | `pr log`; `--start`/`--pushed`/`--stopped` write the procedure's events | 7 |
| `skills/spec/tools/core/columns.ts` | `alignColumns` (lifted from `board/cells.ts`) | 1 |
| `skills/spec/tools/tests/pr-factories.ts` | `prView()`, `check()`, `ghPrViewJson()` (rollup-shaped gh reply); `sequencedRunner` in `stub-runner.ts` | 1 |
| `skills/spec/tools/pr/babysit/log.ts` | babysit log: `appendEvent`, `babysitLogger`, `readEvents`, `parseEvents`, `renderTimeline`; `EventKind` | 2 |
| `skills/spec/tools/commands/pr/log.ts` | `pr log [<target>] [--add]` | 2 |
| `skills/spec/tools/pr/actions/gh-writes.ts` | `ghWrites`: exit-code-aware `create`, `ready`, `merge` (PUT pinned to head → `MergeResult`), own budget, `rerun` (`--job` one / `--failed` several) | 4, 5, 6 |
| `skills/spec/tools/core/land-on-main.ts` | `landOnMain(git, branch, plan)` — one file onto origin's tip, push, retry once; `write \| unchanged \| refused` plans (focus + merge line) | 5 |
| `skills/spec/tools/pr/actions/merge.ts` | `mergePr`: green via `waitStep`, method, PUT, merge line on main, already-merged path | 5 |
| `skills/spec/tools/pr/actions/merge-line.ts` | `mergeLine`, `withMergeLine` — idempotent `PR #n merged …` at the end of Spec state | 5 |
| `skills/spec/tools/commands/pr/merge.ts` | `pr merge` flags (`--now`, `--method`, `--date`) | 5 |
| `skills/spec/tools/pr/actions/ready-race.ts` | `markReadySafely`: draft → ready keyed on new run ids, ≤90 s | 4 |
| `skills/spec/tools/pr/actions/open.ts` | `openPr` orchestration; `pr-text.ts` title/body from Outcome lines | 4 |
| `skills/spec/tools/pr/groups.ts` | `prGroups`, `pickGroup` — a spec's PR groups (resolve + open) | 4 |
| `skills/spec/tools/pr/babysit/poll.ts` | `pollUntil` + `systemClock` — the shared bounded poll loop (phase 3 reuses) | 4 |
| `skills/spec/tools/pr/babysit/wait-step.ts` | `waitStep` — pure settle rules (head lag, stale failures, 3-min grace, conflicts) + `settleLine` | 3 |
| `skills/spec/tools/pr/babysit/wait.ts` | `waitForPr` — resolve, timed `gh pr view` per poll, log waiting + settle | 3 |
| `skills/spec/tools/commands/pr/wait.ts` | `pr wait` flags and defaults | 3 |
| `skills/spec/tools/tests/fake-clock.ts` | `fakeClock()`; `routeGh` (stub-runner.ts) for real git + stubbed gh; `phasedSpecFiles` (pr-factories.ts) | 4 |
| `skills/spec/tools/pr/failures/triage.ts` | `infraFact`, `infraFromLog` — infra or not, signatures over the whole log | 6 |
| `skills/spec/tools/pr/failures/job-logs.ts` | `savedJobLogs`, `jobLogDir`, `jobLogFile` — each failed job's log saved once under `babysit/pr-<n>/` | 6 |
| `skills/spec/tools/pr/actions/rerun-plan.ts` | `planRerun` (pure: all-or-nothing infra, in-progress, `MAX_ATTEMPTS`), `rerunLine` | 6 |
| `skills/spec/tools/pr/actions/rerun.ts` | `rerunPr` — classify, write per run, log `rerun`; `commands/pr/rerun.ts` | 6 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/pr/checks/checks.ts` | `prState`, `summarizeChecks` (carries the verdict), `failedOrCancelled` | |
| `skills/spec/tools/pr/checks/rollup.ts` | `rollupToChecks` — the one mapper + workflow+name dedupe, shared by pr status and the board | `decision-checks-read-on-the-head` |
| `skills/spec/tools/pr/gh-lists.ts` | board's `statusCheckRollup` read, `GH_TIMEOUT_MS` | |
| `skills/spec/tools/board/attention.ts` | needs-you merge/fix rows; suppressed while babysitting | `decision-pr-claims-liveness-only` |
| `skills/spec/tools/claims/rules.ts` | `takeRefusal` (accepts `pr-<group>`), `claimStatus` (unchanged) | `decision-pr-claims-liveness-only` |
| `skills/spec/tools/trees/find.ts` | `treeHolder` already blocks on any live claim in a tree | |
| `skills/spec/tools/trees/naming.ts` | `treeName(spec, group).branch` — PR lookup by branch; `specOfBranch` the inverse (merge line for a PR number) | `decision-pr-found-by-branch-merge-line-on-main` |
| `skills/spec/tools/focus/land.ts` | `landFocus` = `landOnMain` + `planFocus` (lifted in phase 5) | `decision-pr-found-by-branch-merge-line-on-main` |
| `skills/spec/tools/publish/push.ts` | `pathsOutsideSpecDocs` — docs-only test (checked-head fallback) | |
| `skills/spec/tools/launch/command-line.ts` | `sessionLaunch` guard: group token for babysit | |
| `skills/spec/tools/commands/context.ts` | `PACK_MODES` gains babysit | |
| `skills/spec/tools/doctor/settings.ts` | gate-name check; `gates.ci-triage` joins `named` | |
| `skills/spec/tools/board/joins.ts` | board's PR verdict (`toPrCell`, `nextFromChecks`) | |
| `skills/spec/tools/pr/gh.ts` | sync read client, 30-call budget, `PR_FIELDS` (+`url`), `prView(number \| branch)`, uncached `commitRuns` | `gotcha-ghclient-caches-run-reads` |
| `skills/spec/tools/pr/resolve.ts` | `resolvePr(gh, dir, positionals)`: `<spec> <group>` by branch; Spec-state links only for a one-group spec | `decision-pr-found-by-branch-merge-line-on-main` |
| `skills/spec/tools/playbook/settings.ts` | `pr.draft`, `pr.merge`, `checks.external`, new `gates.ci-triage` | |
| `skills/spec/tools/claims/store.ts` | claim files; already accepts any id (no change) | |
| `skills/spec/tools/core/git.ts` | `stateDir(git, …)` / `stateDirIn(commonDir, …)` — `<common-dir>/spec-board/<x>` | |
| `skills/spec/execute.md` | §10 PR gate — the question lands here | |
| `skills/spec/handoff.md` | push/publish/claim release — runs in full before `launch babysit` | `decision-handoff-before-babysit-launch` |

## External references

- CRM `.claude/rules/git-workflow.md` (draft-skip race, merge rule), `.github/workflows/ci.yml`, `e2e.yml`
- GitHub REST: `PUT /repos/{o}/{r}/pulls/{n}/merge`; async merge API (not used, see design.md)
