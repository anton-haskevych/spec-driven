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
| How it waits | `spec.ts pr wait` run as one background Bash call (`run_in_background: true`); Claude Code re-invokes the session once on exit; the last line is the verdict; self-bounded at 25 min; one `gh pr view` per poll | `gh pr checks --watch` raw; Monitor (30-min cap, one event per line); `/loop`/cron/ScheduleWakeup polling (burns a turn per tick, seen 20× on #919); Routines (GitHub triggers don't cover check runs) | One notification per settle, no turns burned. A wrapper handles a lagging head right after a push, a stale failed row right after a re-run, and non-blocking checks, which raw `gh` does not |
| What "green" means | One shared verdict over `statusCheckRollup` on the head: every non-external check passed or was skipped, at least one passed, none cancelled without a newer run; newest run per workflow + name | pr-status's verdict (cancelled ignored, zero checks = green) or the board's (cancelled = failing); a new `CheckRow` model over `gh pr checks` | The two disagree today (`pr/checks.ts:22-31` vs `board/joins.ts:46-52`). Zero checks were merged unchecked (#916, #909). The rollup is what the board already reads and `rollup.ts` already maps and dedupes: one source, one mapper (review 2026-10-10) |
| Docs-only heads | Checks are read on the head. Phase 1 first probes whether a docs-only push on top of code gets checks; only if it doesn't, fall back to the newest checked commit when everything above it is docs-only | Always read the newest code commit ("code head") | Check runs attach only to a push's tip, so a code commit under a docs commit has none: the code-head rule would read `none` on nearly every babysit. During a babysit no docs are pushed, so the case is rare anyway (`ledger/decision-checks-read-on-the-head.md`) |
| Non-blocking checks | `checks.external` globs never block a merge; they are listed apart | A new `checks.ignore` key; GitHub's required list | Same meaning the key already has in pr-status (counted apart). CRM requires no checks, so GitHub's list is empty |
| Merging | `gh api -X PUT repos/{o}/{r}/pulls/<n>/merge -f merge_method=<pr.merge> -f sha=<head>`, exit code checked | Async merge API (`/merge-async`); `gh pr merge --auto` | PUT works from worktrees and is what every agent merge used. Async merge doesn't wait for checks (unverified behaviour, no merge queue here). Auto-merge is off on both repos and merges at once with no required checks |
| Flaky tests | Strict: only infrastructure failures are re-run (runner lost, cancelled with no failed sibling and no timeout, job never started), at most 2 per run (GitHub's `attempt` ≤ 3). A test that fails is fixed in the PR before merge, even if a re-run would pass | Re-run any failure and file the flake for later | Anton, 2026-10-10. Matches CRM `e2e-debugging.md:78` |
| Project triage | The project names a `gates.md` section (`gates.ci-triage`) with its triage steps; the babysitter runs it on a test failure | Hard-code CRM's `e2e:debug` in the plugin | The plugin stays domain-free; gates already carry project command lists |
| Visibility | `pr status` prints every check by state; every pr command appends to a per-PR babysit log; `pr log` prints the timeline. The log is for reading; limits that matter come from GitHub | Rely on the session transcript; enforce the re-run cap from the log | Anton, 2026-10-10: "it could clearly know what is going on … what is pending, running, failed, succeeded, skipped". A fresh session or Anton can read it |
| Holding the tree | The babysit session takes a PR claim (`<spec>#pr-<group>`) for as long as it babysits; freed by release or by the session ending | Rely on session liveness alone; a "done when the PR merged" claim rule | A session waiting on a background shell doesn't hold its tree (2.36.5), so another launch could land in the tree mid-babysit. Any live claim already blocks a tree (`trees/find.ts:84-86`); a merged-PR rule would put GitHub reads into the pure claim status |
| Spec docs during babysit | No docs pushes while CI runs. The asking session's handoff (commit, push/publish-docs, claim release) runs in full **before** `launch babysit`. The merge line lands on main after the merge (commit onto origin's tip, like `spec.ts focus`) | Launch first, then hand off; write PR-link and merge lines into Spec state on the PR branch | A docs push mid-run cancels CI (`concurrency: cancel-in-progress`) or leaves an unchecked head (#915's second failure). Tool-written lines appended on every group branch conflict (spec-loop-automation `gotcha-github-ignores-merge-union`) |
| PR body | Built from the Outcome line of each phase in the PR group | Hand-written each time | The rule already exists (`execute.md:157`); a tool makes it the same every time |
| Finding a group's PR | By branch: `feat/<spec>-pr-<group>` → `gh pr view <branch>`; the babysitter pins the number `pr open` printed | Newest open PR linked in Spec state | With two groups open, the newest-open rule can wait on or merge the other group's PR |

## Who

Anton and any teammate running the loop on their own machine. **No person runs a `pr` command.**
Every `pr` command is called by a Claude Code agent (the execute/handoff session, the babysit
session), so its output is written for that agent: a one-line result last, detail above it.
The person sees one question, one tab, and one report; `pr status` / `pr log` output reaches them
only when they ask the agent "what's going on" and it relays it.

## The question

Asked once, at the PR gate (execute §10), when every code phase of a PR group is ticked and the
pre-PR checks in `pr-opening.md` pass; handoff asks it only if the PR is ready and nobody asked yet.
Default order follows `pr.draft` (`false` → babysit first). The question replaces the *Next sessions*
block in that message, so there is one numbered list.

```
PR B is ready: phases 11–13 (fast-parallel-backend-tests), 14 commits, pre-PR checks green.

  1. Babysit it   open it ready, wait for CI, fix what breaks, merge when green (merge commit)
  2. Draft        open it as a draft for now; CI won't run until it leaves draft
  3. Merge now    open and merge without waiting for CI. Risk: merging deploys; CI hasn't run
```

- **1** → this session hands off in full (commit, push/publish-docs, claim release), then runs
  `spec.ts launch babysit <spec> <group>` as its last act.
  Reply: `Babysitting PR B in iTerm tab 7 (⌘7). You'll hear back once: merged, or what it needs from you.`
- **2** → `spec.ts pr open <spec> --draft`. Reply: `PR #921 opened as a draft · <url>`.
- **3** → `spec.ts pr open <spec> <group>` then `spec.ts pr merge <n> --now`. Reply: `Merged #921 without CI · merge · 1a2b3c4`.

## The babysit flow

```
              ┌──────────── pr open (ready; waits for the last push to settle) ─────────────┐
              ▼                                                                              │
  ┌──► pr wait (background, one notification) ──┬── green ──► pr merge ──► record ──► report ─► end
  │                                             ├── red ────► pr status (failures + facts)
  │                                             │               ├─ infra (runner lost, cancelled)
  │                                             │               │     └─ pr rerun (≤2 per commit) ──┐
  │                                             │               ├─ fails on main too ──► STOP, ask (name main's run)
  │                                             │               ├─ (triage finds it fixed on main) │
  │                                             │               │     └─ merge main, after-merge gate, push ┐
  │                                             │               ├─ test or code failure             │       │
  │                                             │               │     └─ ci-triage gate → fix → per-commit gate → push ┐
  │                                             │               └─ can't tell ──► STOP, ask         │       │       │
  │                                             ├── conflicting ► merge main, resolve, push ────────┤       │       │
  │                                             ├── timeout ───► report what's still running; one more wait, then ask
  │                                             └── merged/closed by someone else ─► record, report, end
  └─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Conflicts are frequent and never stop the babysit: the agent merges main, resolves, gates, pushes and waits again (`ledger/decision-agent-resolves-merge-conflicts.md`); a conflict merge is not a fix push.

Limits: 2 re-runs per run (GitHub's `attempt`), 3 fix pushes per babysit, 3 hours total (counted from
the latest `babysit-start` log event). Hitting one stops and asks. Every arrow is a log event.
After a `pr rerun` or a push, the next `pr wait` ignores failed rows that completed before it.

## What the agents read (and relay on request)

`spec.ts pr status 921` (run by the babysit agent after each wait):

```
PR #921 open · mergeable · head 1a2b3c4
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
PR #921 open · mergeable · head 1a2b3c4
verdict: red · 1 failed · 20 passed · 6 skipped
failed   E2E Tests  9m03s  run 3788 job 9921 · fails on main too: no · infra: no
         ##[error] card-reader.spec.ts:41 Timeout 30000ms exceeded …
triage   gate ci-triage (gates.ci-triage)
```

`spec.ts pr log 921`:

```
PR #921 babysit · B · fast-parallel-backend-tests · started 21:06 · 1 rerun · 1 fix push
21:06 opened ready · head 1a2b3c4
21:07 waiting · 26 checks
21:16 red · E2E Tests failed (9m03s) · card-reader.spec.ts:41
21:18 note · test failure · ours
21:31 pushed 5e6f7a8 · fix: reset the simulated reader between specs
21:32 waiting · 26 checks
21:45 red · Backend Tests failed · runner lost communication · infra
21:45 rerun · Backend Tests · attempt 2 of 3 · run 3787
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

- **No checks yet right after a push:** `pr wait` keeps waiting until GitHub's head is the pushed SHA (`--sha`) and it has checks (up to 3 min), then reports `none · no checks on <sha>` and the babysitter checks why, conflict with main first (`git merge-tree`; a conflicting PR runs no workflows), then a draft, then paths outside CI. `pr wait` already settles `conflicting` at once when GitHub reports it (`mergeable: CONFLICTING` or `mergeStateStatus: DIRTY`).
- **All checks skipped:** `none · CI skipped itself` — push a new commit; a re-run doesn't fix it.
- **Right after a re-run:** the re-run is queued with no start time; it counts as newest, so the old failed row doesn't settle the wait red. A re-run of a run still in progress is refused (`still running — wait`).
- **Draft-skip race** (CRM `git-workflow.md:23-34`): `pr open` marks a draft ready only after the head's push-triggered runs have registered; afterwards it confirms a non-skipped run started. If CI skipped itself, it says so; the fix is a new commit, not a re-run.
- **Stale rows:** the same check name from an older run (draft-era SKIPPED next to new SUCCESS) — the newest row per name wins.
- **Cancelled by a newer push:** ignored when a newer run of that check exists; a cancelled check with nothing newer reads `rerun`.
- **Docs-only head:** checks are read on the head; see the decision row (probe first). The merge always pins the actual head SHA.
- **Someone pushes during babysit:** the merge's `sha` no longer matches → GitHub refuses → wait again on the new head.
- **Merged or closed by someone else:** `pr merge` on a merged PR lands the merge line if missing; report, stop.
- **Two groups of one spec open:** every call after `pr open` uses the pinned PR number.
- **Babysit claim already held:** print who holds it and end.
- **Branch behind main and the failure is already fixed there:** merge main (after-merge gate), push, wait.
- **Session closed mid-babysit:** the PR claim's session is gone, so the claim is free; `pr log` shows where it stopped; the board shows the PR as it is.
- **Board while babysitting:** a live `pr-<group>` claim shows the PR as `babysitting`, with no merge/fix row under needs you.
- **`pr.merge` unset:** `pr merge` refuses and names the setting; the question asks for the method once.
