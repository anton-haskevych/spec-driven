---
needs: [1, 2]
pr: A
---

# Phase 3 — `pr wait`

**Goal:** A background-safe wait that polls the verdict on the code head, logs every check status change, and exits once with one line when the PR settles or the timeout passes.

**Outcome:** Waiting on CI costs the agent one notification instead of dozens of polling turns, and website previews never hold it up · small to medium · risk: a stuck wait — bounded by `--timeout`.

**Files to touch:**
- `skills/spec/tools/pr/wait.ts` (new)
- `skills/spec/tools/commands/pr.ts` (`pr wait`)
- `skills/spec/tools/tests/pr-wait.test.ts` (new)

## Implementation guidance

An async loop with injected `sleep(ms)` and `now()` so tests run instantly over `sequencedRunner` replies (pending → pending → green; pending → red; no rows ×N → none; merged mid-wait). Each poll builds a fresh read client (budget is per client, `pr/gh.ts:17`). Compare each poll's rows with the previous poll's and append a `check` event per changed status (`pr/log.ts`), then a settle event (`green`, `red`, `rerun`, `none`, `timeout`, `merged`, `closed`, `conflicting`). Exit code 0 for green or merged, 1 otherwise; the one-line result formats are in technical.md → Commands.

"No checks yet" right after a push is normal: keep polling up to 3 minutes before settling on `none`.

## Deliverables

- [ ] `pr/wait.ts`: poll loop with injected clock/sleep; settles on verdict or PR state; `--timeout` (default 60m), `--interval` (default 30s); per-poll fresh client — tests for each settle path
- [ ] Status-change `check` events and one settle event appended to the babysit log per run
- [ ] `pr wait [<target>]` prints exactly one result line and sets the exit code; a smoke run on a real open PR of this repo exits green

## Phase-local notes

- Run it with `run_in_background: true`. A foreground `pr wait` blocks the agent's turn (`core/run.ts` is `spawnSync`); the procedure in phase 7 says so.
- A session idle on a background shell doesn't hold its tree (2.36.5) — phase 7's PR claim covers that.
