# PR Babysit — Design

## Problem

Builds on `product-brief.md`. In 70 CRM sessions (2026-10-07 → 10-10) 13 PRs went through CI
and no two were handled the same way: 130 hand-made wait loops, a cron that polled a non-required
Vercel preview for two hours, three PRs left "pushed, haven't waited", eight PRs opened as drafts
so CI never ran until Anton took them out of draft, and Anton pasting failing checks back into
sessions ten times. Two PRs merged on docs-only snapshot heads that CI never checked
(`research/2026-10-10-wave-1-pr-moment-ci-reality.md`).

The PR step becomes one owned, written procedure with tools under it, and a single decision from
the user at the start.

## Key decisions

| Decision | What we chose | Rejected alternative | Why |
|---|---|---|---|
| Who decides | One question per PR at PR-ready time, three answers: babysit to merged / draft for now / merge now | Keep "user opens and merges" (`execute.md:163`); or a setting that babysits without asking | Anton: "I want to approve the PR workflow or have agent ask". His standing rules (CRM memory: ready and merge are his call) stay true: the answer *is* the explicit instruction |
| "Merge now" answer | Kept as the third option: merges without waiting, states the risk once | Only two answers | Anton already uses it ("just merge it", CRM memory `feedback_merge_decisions_are_antons`) |
| Where babysitting runs | A dedicated `/spec babysit <spec>` session launched in the PR's tree | The execute session keeps going | Anton, 2026-10-10. Keeps one session per chunk; one tab per PR shows what is being babysat |
| How it waits | `spec.ts pr wait` run as one background Bash call; exits once with one line | `gh pr checks --watch` raw; Monitor (30-min cap, one event per line); `/loop`/cron polling (burns a turn per tick, seen 20× on #919); Routines (GitHub triggers don't cover check runs) | One notification per settle, no turns burned. A wrapper handles "no checks reported yet" right after a push, docs-only heads and non-blocking checks, which raw `gh` does not |
| What "green" means | One shared verdict: every non-external check on the **code head** passed or was skipped, at least one passed, none cancelled without a newer run | pr-status's verdict (cancelled ignored, zero checks = green) or the board's (cancelled = failing) | The two disagree today (`pr/checks.ts:22-31` vs `board/joins.ts:46-52`). Zero checks and docs-only heads were merged unchecked (#916, #909) |
| Code head | The newest PR commit that touches anything outside `docs/specs/`; checks are read for that commit | Always the PR head | publish-docs pushes docs-only snapshot merges that CI's `paths:` filter skips, leaving the head with zero checks |
| Non-blocking checks | `checks.external` globs never block a merge; they are listed apart | A new `checks.ignore` key; GitHub's required list | Same meaning the key already has in pr-status (counted apart). CRM requires no checks, so GitHub's list is empty |
| Merging | `gh api -X PUT repos/{o}/{r}/pulls/<n>/merge -f merge_method=<pr.merge> -f sha=<head>`, exit code checked | Async merge API (`/merge-async`); `gh pr merge --auto` | PUT works from worktrees and is what every agent merge used. Async merge doesn't wait for checks (unverified behaviour, no merge queue here). Auto-merge is off on both repos and merges at once with no required checks |
| Flaky tests | Strict: only infrastructure failures are re-run (runner lost, cancelled, job never started), at most 2 per commit. A test that fails is fixed in the PR before merge, even if a re-run would pass | Re-run any failure and file the flake for later | Anton, 2026-10-10. Matches CRM `e2e-debugging.md:78` |
| Project triage | The project names a `gates.md` section (`pr.triage`) with its triage steps; the babysitter runs it on a test failure | Hard-code CRM's `e2e:debug` in the plugin | The plugin stays domain-free; gates already carry project command lists |
| Visibility | `pr status` prints every check by state; every pr command appends to a per-PR babysit log; `pr log` prints the timeline | Rely on the session transcript | Anton, 2026-10-10: "it could clearly know what is going on … what is pending, running, failed, succeeded, skipped". A fresh session or Anton can read it |
| Holding the tree | The babysit session takes a PR claim (`<spec>#pr-<group>`) for as long as it babysits | Rely on session liveness | A session waiting on a background shell doesn't hold its tree (2.36.5), so another launch could land in the tree mid-babysit |
| Spec docs during babysit | No docs pushes while CI runs; the merge record is written after merge | Run publish-docs at handoff as today | A docs push mid-run cancels CI (`concurrency: cancel-in-progress`) or leaves an unchecked head (#915's second failure) |
| PR body | Built from the Outcome line of each phase in the PR group | Hand-written each time | The rule already exists (`execute.md:157`); a tool makes it the same every time |

## Who

Anton and any teammate running the loop on their own machine. The babysit session is an agent;
the person sees one question, one tab, and one report.

## The question

Asked when every code phase of a PR group is ticked and the pre-PR checks in `pr-opening.md` pass,
from execute §10 or handoff. Default order follows `pr.draft` (`false` → babysit first).

```
PR B is ready: phases 11–13 (fast-parallel-backend-tests), 14 commits, pre-PR checks green.

  1. Babysit it   open it ready, wait for CI, fix what breaks, merge when green (merge commit)
  2. Draft        open it as a draft for now; CI won't run until it leaves draft
  3. Merge now    open and merge without waiting for CI. Risk: merging deploys; CI hasn't run
```

- **1** → `spec.ts launch babysit <spec> <group>`, then this session hands off.
  Reply: `Babysitting PR B in iTerm tab 7 (⌘7). You'll hear back once: merged, or what it needs from you.`
- **2** → `spec.ts pr open <spec> --draft`. Reply: `PR #921 opened as a draft · <url>`.
- **3** → `spec.ts pr open <spec>` then `spec.ts pr merge <spec> --now`. Reply: `Merged #921 without CI · merge · 1a2b3c4`.

## The babysit flow

```
              ┌──────────── pr open (ready; waits for the last push to settle) ─────────────┐
              ▼                                                                              │
  ┌──► pr wait (background, one notification) ──┬── green ──► pr merge ──► record ──► report ─► end
  │                                             ├── red ────► pr status (failures + facts)
  │                                             │               ├─ infra (runner lost, cancelled)
  │                                             │               │     └─ pr rerun (≤2 per commit) ──┐
  │                                             │               ├─ fails on main too / fixed on main │
  │                                             │               │     └─ merge main, after-merge gate, push ┐
  │                                             │               ├─ test or code failure             │       │
  │                                             │               │     └─ pr.triage gate → fix → per-commit gate → push ┐
  │                                             │               └─ can't tell ──► STOP, ask         │       │       │
  │                                             ├── conflicting ► merge main, resolve, push ────────┤       │       │
  │                                             ├── timeout ───► report what's still running; one more wait, then ask
  │                                             └── merged/closed by someone else ─► record, report, end
  └─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Limits: 2 re-runs per commit, 3 fix pushes per babysit, 3 hours total. Hitting one stops and asks.
Every arrow is a log event.

## What the person sees

`spec.ts pr status 921` (the agent runs it; Anton can ask for it):

```
PR #921 open · mergeable · head 1a2b3c4 · code head 1a2b3c4
verdict: waiting · 2 running · 1 queued · 18 passed · 6 skipped
running  E2E Tests                          7m12s  run 3788
running  Backend Tests                      5m40s  run 3787
queued   Stripe Sandbox Tests
failed   —
passed   Frontend Lint 2m · Frontend Tests (1/2) 6m · Frontend Tests (2/2) 6m · Monorepo Production Build 4m · +14
skipped  Infra Build & Test · DB Schema & Tests · Ops Tests · +3 (no changes)
external Vercel – crm-dance-landing pending · 9 more passed (not blocking)
```

Red:

```
PR #921 open · mergeable · head 1a2b3c4 · code head 1a2b3c4
verdict: red · 1 failed · 20 passed · 6 skipped
failed   E2E Tests  9m03s  run 3788 job 9921 · fails on main too: no · fixed on main: no · infra: no
         ##[error] card-reader.spec.ts:41 Timeout 30000ms exceeded …
triage   gate e2e-triage (pr.triage)
```

`spec.ts pr log 921`:

```
PR #921 babysit · B · fast-parallel-backend-tests · started 21:06 · 1 rerun · 1 fix push
21:06 opened ready · head 1a2b3c4
21:07 waiting · 26 checks
21:16 red · E2E Tests failed (9m03s) · card-reader.spec.ts:41
21:18 triage · test failure · ours
21:31 pushed 5e6f7a8 · fix: reset the simulated reader between specs
21:32 waiting · 26 checks
21:45 red · Backend Tests failed · runner lost communication · infra
21:45 rerun · Backend Tests · 1 of 2 for 5e6f7a8
21:58 green · 21 passed · 6 skipped · external: 1 pending (not blocking)
21:58 merged · merge · 9b0c1d2
```

The final report in the babysit tab (one message):

```
Merged PR #921 (fast-parallel-backend-tests B) · merge commit 9b0c1d2 · 52 min
- Fixed: card-reader.spec.ts shared the simulated reader across specs (5e6f7a8)
- Re-ran: Backend Tests once (runner lost)
- On merge: main deploys the staff app
Next: phase 14 is ready in tree …-pr-c3.
```

## Edge cases

- **No checks yet right after a push:** `pr wait` keeps waiting until the code head has checks (up to 3 min), then reports `none · no checks on <sha>` and the babysitter checks why: conflicting PR (no workflows run), a draft, or paths outside CI.
- **Draft-skip race** (CRM `git-workflow.md:23-34`): `pr open` marks a draft ready only after the head's push-triggered runs have registered; afterwards it confirms a non-skipped run started. If CI skipped itself, it says so; the fix is a new commit, not a re-run.
- **Stale rows:** the same check name from an older run (draft-era SKIPPED next to new SUCCESS) — the newest row per name wins.
- **Cancelled by a newer push:** ignored when a newer run of that check exists; a cancelled check with nothing newer reads `rerun`.
- **Docs-only head:** checks come from the code head; the merge still pins the actual head SHA.
- **Someone pushes during babysit:** the merge's `sha` no longer matches → GitHub refuses → wait again on the new head.
- **Merged or closed by someone else:** record it, report, stop.
- **Branch behind main and the failure is already fixed there:** merge main (after-merge gate), push, wait.
- **Session closed mid-babysit:** the PR claim's session is gone, so the claim is free; `pr log` shows where it stopped; the board shows the PR as it is.
- **`pr.merge` unset:** `pr merge` refuses and names the setting; the question asks for the method once.
