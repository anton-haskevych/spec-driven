# Oversee Crew — Design

## Problem

On 2026-10-11 one CRM session ran three spec lanes plus PR babysitters by hand for 5½ hours
and shipped #927, #890 and #929 to prod (research `wave-0`). It worked, but it was improvised
and Anton stayed the bottleneck:

- Workers refused approvals passed along by message (#890 babysit, Academy 20). Claude Code
  itself treats a peer message as never consent.
- Instructions arrived after launch; the deploy stop rule reached a babysitter after crm-prod
  had already shipped 10 Lambdas. A message went to an old session that shared a name.
- Questions got lost (parking notes, a page title) or were asked about 8 times (Mindbody pull).
- Slots sat idle up to an hour on the PR question or a design gate.
- A review stack held ports 4800 and 3306 for hours and blocked other workers.
- Anton typed "check in with the agents" five times and closed leftover tabs himself.
- Every babysitter got a hand-written deploy runbook; one deploy shipped other people's code.

## Who

Anton first (CRM Dance, one Mac, Max plan, bypass permissions by default). Any teammate
running the spec loop can use it; nothing changes for sessions that don't start an overseer,
except that branches are pushed from the first commit.

## Decisions

| Decision | What we chose | Rejected alternative | Why |
|----------|---------------|----------------------|-----|
| Who approves | A worker passes only gate kinds the project allows (phase 5 `crew.self-approve`); everything else parks for Anton | The overseer approves on Anton's behalf | Workers refused relayed approvals on Oct 11, rightly; Claude Code says a peer message is never consent |
| How workers get instructions | A launch brief, appended to the worker's system prompt at launch (`--append-system-prompt-file`), plus only "hand off now" as a live message | Messages after launch (Oct 11) | Late messages caused the early deploy and the wrong-session message; the brief is fixed for the session's life (`--system-prompt-snapshot`) |
| Workers | Background sessions: `claude --bg`, `--permission-mode bypassPermissions`, attach only to look | iTerm tabs via `spec.ts launch` (Oct 11) | Unique ids, `claude stop`/`rm`, readable state in `claude agents --json`, no leftover tabs; probed live (waves 2, 2b, 2c) |
| Permissions | Always `bypassPermissions` for workers, enforced in the launch line | The user's default mode | Anton: "I trust my workers." Hook-driven asks still surface as `blocked` + `waitingFor` |
| Waking the overseer | A watcher over `claude agents --json` under the Monitor tool, plus a 30-minute heartbeat (`ScheduleWakeup` in a self-paced `/loop`) | `SendMessage {notify_when_idle}` (Oct 11) | Idle notices fire once, arrive twice, fire for sessions the overseer closed itself, and can't tell done from asking |
| Overseer state | A local run file `<git-common-dir>/spec-board/crew/run.md`, written only by the overseer; one handoff note file per worker | A committed file; CRM memory (Oct 11) | One writer, no merge conflicts (`gotcha-github-ignores-merge-union`), survives the overseer's own compaction, no edits to Anton's feedback memory |
| Ship mode | `ship: auto \| hold-for-review` in the spec's `CLAUDE.md`; no value → asked once per spec, answer kept in the run file | One project-wide setting; asking at every PR | UI work wants Anton's eyes, refactors don't; per-spec matches how he decided on Oct 11 (#930 hold, #929 auto) |
| A standing ship mode at all | Allowed, per spec | pr-babysit `design.md:19` ("no setting that babysits without asking") | Anton, 2026-10-12: "if I indicate that it should be babysat and shipped automatically, that's a good workflow"; the per-spec value is his explicit instruction, written down |
| hold-for-review | Babysit to green, add the `hold-for-review` label and a *How to review* section, stop. Nothing left running locally. Approval on GitHub → merged like auto (phase 2) | Keep a local stack running for the review (Oct 11, #930) | The stack held ports for hours; Anton: "I don't want it to be running in the background and stealing the valuable CPU or RAM" |
| After merge (auto) | Babysit works through the project's after-merge gate (`gates.after-merge` → a `gates.md` section), then marks the phases deployed | A deploy tool in the plugin | Deploys differ per project (CRM: none, auto-on-merge workflow, CDK stacks, blue/green); the gates mechanism already exists |
| Push | Push the branch when work starts and after every commit; a branch with an open ready PR pushes at the end of the chunk | Push at handoff only (today) | Interrupted work is safe and visible on origin; CRM runs no CI on branch pushes or drafts (`ci.yml:76`), and a ready PR re-runs CI on every push |
| Pause | "Time to pause" = every active worker hands off now (clean boundary, commit, push, release, stop), then the run file is saved as stood down | Killing the sessions | Nothing is lost; resume starts from saved state |
| Which rows a slot takes | Board ready rows with `next: execute`, a free tree, no live or remote claim, not parked; prep/create/review stay with Anton | Any ready row | Prep has a hard human stop; reviews can join later once phase 3 ships |
| Order of work | Phase 1 fast path (mostly written steps), then the crew builds phases 2–5 | Build every tool first | Value now; the first real run shows what to harden (Anton, 2026-10-12) |
| Sub-command name | `/spec oversee-crew`; spec folder `oversee-crew-spec` | `run`, `dispatch`, `conduct`, `autopilot-squad` (25 considered) | Anton picked it: "Oversee" says it watches and doesn't do the work, "crew" says there are several workers |
| Vocabulary | slot, worker, overseer, launch brief, handoff note, stood down | lane, controller, brief, report, paused | Those words already mean board lanes, the controller tab (`SKILL.md:81`), `product-brief.md`, a command's output, and spec `status: paused` |

## Core flow

```
                 ┌──────────── Anton ─────────────┐
                 │ go · answers · reviews · pause │
                 └───────▲──────────────┬─────────┘
          needs-you batch│              │instructions
                 ┌───────┴──────────────▼─────────┐
 board ready ───►│  Overseer (writes no code)     │◄── watcher: one line per worker change
 lane            │  run.md · roster · close-out   │◄── heartbeat every 30 min
                 └───┬───────────────┬────────────┘
        fill a slot  │               │ PR group ready
                     ▼               ▼
         ┌──────────────────┐  ┌───────────────────────────┐
         │ Worker (claude   │  │ Babysitter (claude --bg)  │
         │ --bg, bypass,    │  │ auto: merge → after-merge │
         │ launch brief)    │  │   gate → mark deployed    │
         │ /spec execute    │  │ hold-for-review: green →  │
         │ push every commit│  │   label + How to review → │
         │ handoff note     │  │   stop                    │
         └──────────────────┘  └───────────────────────────┘
```

### Starting a run
1. Anton types `/spec oversee-crew` in the project's main checkout.
2. The overseer reads the board (`spec.ts board --json`), the roster (`claude agents --json`,
   this repo's worktrees only) and any existing run file.
3. One message: slot count, the ready rows it will start, ship modes it found and the ones it
   needs. Anton answers once ("go", or changes).
4. It writes the run file, fills the slots, starts the watcher and the heartbeat.

### A worker's life
```
 launched ──► working ──► done ─────────────► close-out check ──► stop + rm ──► slot free
                 │                                   │ fails
                 │                                   └──► tell the worker, or Anton
                 ├──► blocked + waitingFor ──► needs you: "claude attach <id>" + push notification
                 │       (permission prompt)       Anton answers in that tab ──► working
                 └──► blocked, no waitingFor ──► read its last message ──► queue the question
                         (ended on a question)      stop + rm ──► slot free (phase parked)
```
States come from `claude agents --json` (waves 2, 2b, 2c): `working`, `done`,
`blocked` with `waitingFor`, `blocked` without it.

### The PR moment
1. A worker's handoff note says its PR group is ready (all group phases ticked, pre-PR checks green).
2. The overseer checks the PR's real state (`spec.ts pr status <spec> <group>`): merged or
   closed → nothing to launch (the #901 mistake); otherwise continue.
3. Ship mode: the spec's `ship:` → the run file's answer for that spec → ask Anton once.
4. It launches a background babysitter in the group's tree with a launch brief naming the mode.
5. auto: merge on green, after-merge gate, mark deployed, one line to Anton.
   hold-for-review: green, label, *How to review*, stop, one line to Anton.

### Needs you
One queue in the run file. The overseer batches unasked items into one message, asks each
once, records the answer with its time, and relaunches the parked phase with the answer in
its launch brief. A worker stuck on a prompt also gets a push notification.

### Pause and resume
"Time to pause" → the overseer sends each active worker "Hand off now" → each finishes its
step, commits at a clean boundary, pushes, releases its claim and stops → the overseer
stops and removes them, stops the heartbeat and saves the run file as `stood-down`.
"Resume" → read the run file, answered questions first, then refill slots from the board.

## Copy

**Start**
```
Crew for crm: 3 workers, 2 babysitters.
Ready now, in order:
  1. multi-location-studios 6a        Academy 10-31
  2. cross-studio 9                   Ian
  3. lifecycle-email-foundation 4
Ship modes: multi-location-studios hold-for-review (spec) · lifecycle-email-foundation auto (spec)
Needs your answer: cross-studio, auto or hold-for-review?
Go?
```

**One line per event** (nothing else unprompted)
```
Merged #929 lifecycle-email-foundation A · deployed (crm-prod, lifecycle stack) · phases 1–3 marked deployed
Held #930 multi-location-studios A for your review · green · How to review is in the PR
```

**Needs you**
```
Needs you (3)
1. multi-location-studios 5a asks: show parking and arrival notes in booking emails at every
   studio? I'd say no for now.
2. #930 is green and labelled hold-for-review. How to review is in the PR.
3. cross-studio 9 is stuck on a permission prompt. Open it: claude attach 2c555dd2
```

**Pause**
```
Paused. 3 workers handed off, pushed and stopped:
  multi-location-studios 6a (4 of 9 done) · cross-studio 9 (recon only) · lifecycle-email-foundation 4 (done)
Saved to the run file. Say "resume" to pick up.
```

**Babysitter, hold-for-review**
```
PR #930 (multi-location-studios A) is green and held for your review · 17 checks passed
- Label: hold-for-review · How to review: in the PR description
- Nothing is running locally
```

**PR label and section** — label `hold-for-review` (created if missing). PR body gains:
```
## How to review
1. <how to start what the change needs, e.g. pnpm dev:all --reset-db>
2. <who to log in as, which data to use>
3. <the N screens or behaviours to check, and what "right" looks like>
```

**Worker launch brief** — technical.md → *Launch brief*.

## Edge cases

| Case | What happens |
|------|--------------|
| Worker hits the stopping rule mid-phase | Its handoff note says `Next: <same phase>`; the overseer relaunches the same phase in the same tree with a fresh session |
| Worker crashes or exits without a handoff note | Roster shows it gone; close-out check finds the claim `closed` or the tree dirty → needs you, never a silent relaunch over half-done work |
| Tree busy (`trees: <path> is busy`) | Skip that row this round; take the next one |
| Claim held by a teammate or another machine | Skip; the board's needs-you already lists stale remote claims for Anton |
| PR already merged or closed | No babysitter (the #901 case); note it once |
| CI red twice on the same failure, or red on main too | Babysit's existing §4 stop-and-ask; arrives in the needs-you batch |
| Worker ended on a question | Parked: its question goes to the queue, its slot is freed |
| Worker stuck on a prompt | Needs you with `claude attach <id>`; slot stays held until it moves |
| Folder never trusted | `claude --bg` refuses ("Workspace not trusted"); needs you: open `claude` there once. Worktrees of a trusted repo inherit trust |
| Overseer compacts during a long run | Everything it needs is in the run file; after a compaction it re-reads the run file and the roster before acting |
| Overseer session closes | Workers keep running (background); `/spec oversee-crew` again resumes from the run file |
| Two overseers in one clone | The run file records the overseer's session id; a second one refuses while that session is live |
| Two workers on one spec | Allowed in different PR-group trees; shared spec docs may conflict until self-driving-loop phase 3 lands |
| Migration-number or other project collisions | Project-side; the overseer passes known facts as launch-brief notes, it doesn't reserve numbers |
| hold-for-review PR falls behind main while waiting | Approval (phase 2) sends it to an auto babysitter, which merges main as part of its normal flow |
| `docs: branch` project marking deployed after merge | Phase 1 publishes the marker only where `docs: main` (`publish-docs`); phase 2 adds `phase deployed --land` for the rest |
| Machine load | Slot cap is the brake (3 + 2 by default); loadwatch shows which worker is heavy |
