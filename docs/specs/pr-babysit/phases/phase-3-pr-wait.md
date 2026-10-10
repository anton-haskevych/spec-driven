---
needs: [1, 2]
pr: A
---

# Phase 3 — `pr wait`

**Goal:** A background-safe wait that polls the verdict on the head with one `gh pr view` per poll and exits once with one line when the PR settles or the timeout passes.

**Outcome:** Waiting on CI costs the agent one notification instead of dozens of polling turns, and website previews never hold it up · small to medium · risk: a stuck wait — bounded by `--timeout` and a per-call gh timeout.

**Files to touch:**
- `skills/spec/tools/pr/babysit/wait.ts`, `pr/babysit/wait-step.ts` (new; `pollUntil` in `poll.ts` landed in phase 4)
- `skills/spec/tools/commands/pr.ts`, `commands/pr/wait.ts`
- `skills/spec/tools/tests/pr-wait.test.ts` (new)

## Implementation guidance

Split the logic from the loop. `waitStep(view, context, nowMs) → { settle } | { waiting }` is pure (`pr/babysit/wait-step.ts`): it decides whether this poll settles (`green`, `red`, `cancelled`, `none`, `merged`, `closed`, `conflicting`) and what to log. `pollUntil(read, settled, { interval, deadline, sleep, now })` is the one polling helper (phase 4's ready check uses it too). `wait.ts` wires them: each poll is one `gh pr view <n> --json …,statusCheckRollup` with `GH_TIMEOUT_MS` through the sync `Runner` every pr module takes (not `ghClient`: its 30-call budget runs out mid-wait) — no failure facts, no log tails, no `buildReport`.

Inputs that keep it from settling on stale data:
- `--sha` (default: the tree's `HEAD` when run in the PR's tree): while `headRefOid` ≠ it, keep polling.
- `--since` (default: the last `pushed`/`rerun` event in the babysit log): a failed row whose `completedAt` is before it doesn't settle red.
- "No checks yet" right after a push is normal: keep polling up to 3 minutes before settling on `none`.

Write the settle event to the log before printing the line, so a killed background shell still leaves it. Default `--timeout` 25m (unattended background shells may be cut at 30 min); the procedure re-waits. No exit code: the CLI always exits 0 and the one line is the result.

## Deliverables

- [x] `pr/babysit/poll.ts` `pollUntil` with injected sleep/now — tests
- [ ] `waitStep` pure settle logic incl. `--sha` lag, `--since` stale-failure skip, 3-min `none`, all-skipped `none` — table tests over `sequencedRunner` replies (pending → green; pending → red; queued re-run beside the old failure stays waiting; no rows ×N → none; merged mid-wait; head lag)
- [ ] Live probe in a launched `claude -n` tab (nobody typing): a background Bash `pr wait` on a real open PR re-invokes the idle session on exit; record what the notification carries (output, exit code) and whether a `--bg`/`-p` session cuts it at 30 min — `domain` ledger entry updated with the result
- [ ] `pr wait [<target>]` prints exactly one result line (technical.md → Commands), logs `waiting` and one settle event; a smoke run on a real open PR of this repo prints green

## Phase-local notes

- Run it with `run_in_background: true`. A foreground `pr wait` hits the Bash timeout (120 s default, 600 s max) and gets moved to the background anyway; the procedure in phase 7 says background from the start (technical.md → *How Claude Code invokes them*).
- A session idle on a background shell doesn't hold its tree (2.36.5) — phase 7's PR claim covers that.
