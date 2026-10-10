---
needs: []
pr: A
---

# Phase 2 — Babysit log and `pr log`

**Goal:** A per-PR event log in the git common dir that `pr` commands and the agent append to, and `pr log` that prints it as a timeline.

**Outcome:** When a PR babysit goes wrong (or right), you or a fresh session read one timeline of what happened: what started, what failed and why, what was re-run, what was pushed, when it merged · small · risk: none (new file; observational, nothing enforces a rule from it).

**Files to touch:**
- `skills/spec/tools/pr/babysit/log.ts` (new)
- `skills/spec/tools/core/git.ts` (`stateDir`), `claims/store.ts`, `mainline/base-cache.ts` (use it)
- `skills/spec/tools/commands/pr.ts`, `commands/pr/log.ts` (`pr log`)
- `skills/spec/tools/tests/pr-log.test.ts` (new)

## Implementation guidance

Lift `stateDir(git, ...segments)` into `core/git.ts` first (claims and the base cache build `<common>/spec-board/...` by hand today; this is the third use) — refactor commit, green.

Pure core plus a thin file edge: `appendEvent(dir, pr, event)` and `readEvents(dir, pr)` over `<git-common-dir>/spec-board/babysit/pr-<n>.jsonl`, and a pure `renderTimeline(events, tz)`. Event shape and kinds: technical.md → Babysit log. `pr log --add "<text>"` writes a `note` event (the procedure's triage decisions and stops in words). Header from the latest `babysit-start`: PR, group, spec, start time, counts of reruns and pushes since then.

Times render in local time; tests pass a fixed zone (ledger `gotcha-bun-test-runs-in-utc-but-spawned-children-do-not`).

## Deliverables

- [ ] `core/git.ts` `stateDir`; claims and base cache use it (refactor, green)
- [ ] `pr/babysit/log.ts`: `appendEvent`, `readEvents` (skips malformed lines, says how many), `renderTimeline` with header from the latest `babysit-start` — tests over a temp dir
- [ ] `pr log [<target>] [--add "<text>"]` in the `pr` group; empty log prints `PR #n: no babysit log on this machine`

## Phase-local notes

- One file per PR per clone; teammates' machines have their own — the board doesn't read it, and no limit is enforced from it (re-run cap is GitHub's `attempt`).
