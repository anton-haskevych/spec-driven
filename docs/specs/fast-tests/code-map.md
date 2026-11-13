# Code Map — Fast Tests

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/tests/real-git-allowlist.test.ts`, `tests/real-git/` | Guard: allowlist data, import closure + repo-build scan, `git` tripwire | 1 |
| `docs/specs/_playbook/gates.md` | `per-commit` and `pre-pr` gates for this repo | 1 |
| `skills/spec/tools/tests/*-contract.ts` | Record, read and remote port contracts run on real git and fakes | 2 |
| `skills/spec/tools/core/git-seams.ts` | `GitSeams` bundle, `seamsOf`, `recordPortsOf` | 3, 3a |
| `skills/spec/tools/tests/command-deps.ts` | Command deps builders on fakes; fake `land` | 3, 3a |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/board/load.ts`, `mainline/load.ts` | Board load runs fetch, archive and worktree scan; `seams` on `BoardRunners` | `decision-git-seams-bundle.md` |
| `skills/spec/tools/plan/record-send.ts`, `plan/read-plans.ts` | `recordWorld` and the read helpers; ports without branch | `decision-git-seams-bundle.md` |
| `skills/spec/tools/core/land-on-main.ts` and its callers | `land` seam; pr-babysit edits it too | `decision-git-seams-bundle.md` |
| `skills/spec/tools/tests/fake-ref.ts`, `fake-record.ts`, `stub-runner.ts` | Fakes and `gitStub`; live-board edits `fake-record.ts` | — |
| `skills/spec/tools/tests/git-repo.ts`, `joined-repo.ts` | Real-git helpers; spec-loop-automation edits `git-repo.ts` | — |

## External references

-
