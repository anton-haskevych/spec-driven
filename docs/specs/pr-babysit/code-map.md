# Code Map — PR Babysit

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/pr/checks/verdict.ts` | `checksVerdict`, `externalMatcher` — the one green verdict | 1 |
| `skills/spec/tools/pr/check-table.ts` | `pr status` check table grouped by state | 1 |
| `skills/spec/tools/commands/pr.ts` | `pr` group `ACTIONS` table; verbs in `commands/pr/<verb>.ts` | 1 |
| `skills/spec/tools/core/columns.ts` | `alignColumns` (lifted from `board/cells.ts`) | 1 |
| `skills/spec/tools/tests/pr-factories.ts` | `prView()`, `check()`; `sequencedRunner` in `stub-runner.ts` | 1 |
| `skills/spec/tools/pr/babysit/log.ts` | babysit log: `appendEvent`, `readEvents`, `parseEvents`, `renderTimeline`; `EventKind` | 2 |
| `skills/spec/tools/commands/pr/log.ts` | `pr log [<target>] [--add]` | 2 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/pr/checks/checks.ts` | `prState`, `summarizeChecks` (carries the verdict) | |
| `skills/spec/tools/pr/checks/rollup.ts` | `rollupToChecks` — the one mapper + workflow+name dedupe, shared by pr status and the board | `decision-checks-read-on-the-head` |
| `skills/spec/tools/pr/gh-lists.ts` | board's `statusCheckRollup` read, `GH_TIMEOUT_MS` | |
| `skills/spec/tools/board/attention.ts` | needs-you merge/fix rows; suppressed while babysitting | `decision-pr-claims-liveness-only` |
| `skills/spec/tools/claims/rules.ts` | `takeRefusal` (accepts `pr-<group>`), `claimStatus` (unchanged) | `decision-pr-claims-liveness-only` |
| `skills/spec/tools/trees/find.ts` | `treeHolder` already blocks on any live claim in a tree | |
| `skills/spec/tools/trees/naming.ts` | `treeName(spec, group).branch` — PR lookup by branch | `decision-pr-found-by-branch-merge-line-on-main` |
| `skills/spec/tools/focus/land.ts` | commit-onto-origin-tip path lifted to `core/land-on-main.ts` | `decision-pr-found-by-branch-merge-line-on-main` |
| `skills/spec/tools/publish/push.ts` | `pathsOutsideSpecDocs` — docs-only test (checked-head fallback) | |
| `skills/spec/tools/launch/command-line.ts` | `sessionLaunch` guard: group token for babysit | |
| `skills/spec/tools/commands/context.ts` | `PACK_MODES` gains babysit | |
| `skills/spec/tools/doctor/settings.ts` | gate-name check; `gates.ci-triage` joins `named` | |
| `skills/spec/tools/board/joins.ts` | board's PR verdict (`toPrCell`, `nextFromChecks`) | |
| `skills/spec/tools/pr/gh.ts` | sync read client, 30-call budget, `PR_FIELDS`, `RUN_FIELDS` | |
| `skills/spec/tools/pr/resolve.ts` | PR from spec's Spec state (`SPEC_STATE`, `PR_LINK`) | |
| `skills/spec/tools/playbook/settings.ts` | `pr.draft`, `pr.merge`, `checks.external`, new `gates.ci-triage` | |
| `skills/spec/tools/claims/store.ts` | claim files; already accepts any id (no change) | |
| `skills/spec/tools/core/git.ts` | `stateDir(git, …)` / `stateDirIn(commonDir, …)` — `<common-dir>/spec-board/<x>` | |
| `skills/spec/execute.md` | §10 PR gate — the question lands here | |
| `skills/spec/handoff.md` | push/publish/claim release — runs in full before `launch babysit` | `decision-handoff-before-babysit-launch` |

## External references

- CRM `.claude/rules/git-workflow.md` (draft-skip race, merge rule), `.github/workflows/ci.yml`, `e2e.yml`
- GitHub REST: `PUT /repos/{o}/{r}/pulls/{n}/merge`; async merge API (not used, see design.md)
