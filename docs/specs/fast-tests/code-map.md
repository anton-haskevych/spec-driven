# Code Map — Fast Tests

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/tests/real-git-allowlist.test.ts`, `tests/real-git/` | Guard (`allowlist.ts` data, `scan.ts` import closure, `repo-builds.ts` ast-grep scan); `tripwire.ts` + `tripwire/git` + `fast-tier.ts` behind `bun run test:fast` | 1 |
| `docs/specs/_playbook/gates.md` | `per-commit` and `pre-pr` gates for this repo | 1 |
| `skills/spec/tools/tests/*-contract.ts`, `fake-remote.ts`, `fake-record.test.ts` | Record, read and remote port contracts: real side in `record-ref.git.test.ts` / `claims-remote.git.test.ts`, fake side in `fake-record.test.ts` | 2 |
| `skills/spec/tools/core/git-seams.ts` | `GitSeams` bundle, `seamsOf`, `recordPortsOf` | 3, 3a |
| `skills/spec/tools/tests/command-deps.ts` | Command deps builders: `phaseDeps()` (phase 1, on `notARepoRunner`), the rest on fakes; fake `land` | 1, 3, 3a |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/board/load.ts`, `mainline/load.ts` | Board load runs fetch, archive and worktree scan; `seams` on `BoardRunners` | `decision-git-seams-bundle.md` |
| `skills/spec/tools/plan/record-send.ts`, `plan/read-plans.ts` | `recordWorld` and the read helpers; ports without branch | `decision-git-seams-bundle.md` |
| `skills/spec/tools/core/land-on-main.ts` and its callers | `land` seam; pr-babysit edits it too | `decision-git-seams-bundle.md` |
| `skills/spec/tools/tests/fake-ref.ts`, `fake-record.ts`, `stub-runner.ts` | Fakes, `notARepoRunner` (phase 1) and `gitStub`; live-board edits `fake-record.ts` | `gotcha-fast-tier-git-leaks-through-production-defaults.md` |
| `skills/spec/tools/hooks/spec-file-check.ts` | `hookResponse` takes a runner (phase 1) | — |
| `skills/spec/tools/tests/git-repo.ts`, `joined-repo.ts` | Real-git helpers; spec-loop-automation edits `git-repo.ts` | — |

## External references

-
