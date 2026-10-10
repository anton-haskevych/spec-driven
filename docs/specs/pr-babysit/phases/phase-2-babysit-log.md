---
needs: []
pr: A
---

# Phase 2 — Babysit log and `pr log`

**Goal:** A per-PR event log in the git common dir that every `pr` command appends to, and `pr log` that prints it as a timeline.

**Outcome:** When a PR babysit goes wrong (or right), you or a fresh session read one timeline of what happened: what started, what failed and why, what was re-run, what was pushed, when it merged · small · risk: none (new file, nothing reads it yet).

**Files to touch:**
- `skills/spec/tools/pr/log.ts` (new)
- `skills/spec/tools/commands/pr.ts` (`pr log`)
- `skills/spec/tools/tests/pr-log.test.ts` (new)

## Implementation guidance

Pure core plus a thin file edge: `appendEvent(dir, pr, event)` and `readEvents(dir, pr)` over `<git-common-dir>/spec-driven/babysit/pr-<n>.jsonl` (find the common dir the way `claims/store.ts` does), and a pure `renderTimeline(events, tz)`. Event shape and kinds: technical.md → Babysit log. `pr log --add "<text>"` lets the procedure write `triage` and `stopped` lines in words. `pr log --all` shows per-check transitions; the default folds them into the settle lines. Header line: PR, group, spec, start time, counts of reruns and pushes.

Times render in local time; tests pass a fixed zone (ledger `gotcha-bun-test-runs-in-utc-but-spawned-children-do-not`).

## Deliverables

- [ ] `pr/log.ts`: `appendEvent`, `readEvents` (skips malformed lines, says how many), `renderTimeline` with header and folded `check` events — tests over a temp dir
- [ ] `pr log [<target>] [--all] [--add "<text>"]` in the `pr` group; empty log prints `PR #n: no babysit log on this machine`

## Phase-local notes

- One file per PR per clone; teammates' machines have their own — the board doesn't read it.
