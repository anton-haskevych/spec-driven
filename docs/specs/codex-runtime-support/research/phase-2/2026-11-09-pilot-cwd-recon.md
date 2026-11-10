# Serial phase reconnaissance: pilot cwd occupancy

Scope: the assigned native entry occupancy gap only. Controller reassignment on 2026-11-09 explicitly replaces parallel recon with serial model work for this exclusive pilot. The initial parallel attempt refused recall (`session-1-recall.log`); it is failed evidence. The controller archived those threads before the successful reassigned bootstrap/recall. Full managed agent/reviewer parity remains required in Phase 4.

## Seam and reuse

- `skills/spec/tools/runtime/codex/entry.ts:38-63`: `runCodexEntry` verifies workspace, target and native discovery, then compares other session cwd strings with raw equality/prefix at line 60. The source-qualified `sameSession` self-exclusion already exists; preserve it.
- `runtime/pilot-workspace.ts:8-31` (under `skills/spec/tools/`): `realpathSync`, existing Git/common-dir/workspace readers and conservative `Result` errors establish the canonical pilot root. Keep these checks unchanged.
- `commands/doctor-file.ts:10-24`: reuse its standard `realpathSync` plus `relative`/`isAbsolute`/`sep` containment idiom; no new path library/framework is needed.
- `runtime/codex/probe.ts:32-54` and `scan.ts:13-43`: injected bounded native discovery supplies plain sessions and coverage. Do not redesign scanner/ownership or relax initiating ID/cwd evidence.
- `tests/codex-entry.test.ts:19-45,113-127`: existing disposable separate Git repositories, real spec fixture, typed dependency object and injected observe callback exercise the actual entry without a daemon. Extend this file for the filesystem regression.
- `tests/runtime-legacy-readers.test.ts:88-125`: retain frozen historical source hashes and linked-worktree positive control beside separate-clone exclusion. It runs discovery in disposable repositories, never removal on real work.

## Testing issues

- Entry is 118 lines; entry test is 147 lines. Both have room below the 250-line file cap; keep new callbacks/helpers below 50 lines and four parameters. No extract-first refactor is needed.
- Create actual directories/symlinks within disposable repository roots. Use `isolatedRunner`; no test reads native daemon/home state. Bun 1.4.4 is installed; existing node:fs/node:path compatibility primitives suffice.
- Cover direct/nested cwd, symlink root/nested aliases, unrelated and prefix-neighbor paths, and unreadable evidence (missing/dangling/cyclic aliases). Permission-only fixtures are unreliable across execution users; deterministic realpath failures provide conservative evidence.
- Preserve qualified identity by checking equal native IDs on different sources/runtimes are not self. No source/ID alias or shared writer activation.
- First run the regression against unchanged production code. Proceed only if the filesystem symlink tests reproduce the gap. Frozen installed candidate bytes remain distinct from changed pilot source under test.

One wave is sufficient: the seam, reusable mechanism and test harness are explicit. No open recon question or new external dependency.
