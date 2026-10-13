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
| Waking the overseer | One background-Bash roster wait over `claude agents --json`, scoped to launched ids; exits on the first change or after 1800 s (the heartbeat) | `SendMessage {notify_when_idle}` (Oct 11); a Monitor `while :` watcher plus a `/loop` + `ScheduleWakeup` heartbeat (first draft) | Idle notices can't tell done from asking; Monitor dies at its 30-min cap and the heartbeat is a second mechanism. Background Bash is the house wait primitive (`pr wait`), probed to re-invoke an idle session (review 2026-10-12) |
| Overseer state | One home per piece: who runs what = roster + claims + launch titles; questions = the worker's `in-flight.md`; the local `run.md` keeps only caps, overseer id, ship answers, question bookkeeping, pending launches, a capped log | A committed file; CRM memory (Oct 11); a hand-kept slot list and a per-worker note file under `.git/` (first draft) | Copies drift (crash, manual stop, compaction); a worker in a worktree can't Write under the main repo's `.git/` (Anton's file guard); `in-flight.md` is committed, so other machines see the question (review 2026-10-12) |
| Overseer lifetime | Long-lived controller that rotates on compaction: state is external, it prints "type /spec oversee-crew in a fresh session" and stops; workers keep running | Working on from a compaction summary | SKILL.md: compaction is not part of the flow; rules like "never merge a held PR" must not live only in a summary |
| Which sessions it touches | Only ids it launched; never stops a session whose claim is live | Every session under the worktree root | Anton's own tabs and babysitters waiting on CI would be closed out |
| Ship mode | `ship: auto \| hold-for-review` in the spec's `CLAUDE.md`; no value → asked once per spec; phase 1 keeps the answer in `run.md`, phase 2 writes it to `ship:` on main (`spec.ts ship`, focus pattern); a project default is `pr.ship` (phase 5) | One project-wide setting only; asking at every PR; the default under `crew:` | UI work wants Anton's eyes, refactors don't; per-spec matches how he decided on Oct 11 (#930 hold, #929 auto); the PR moment exists without a crew too |
| A standing ship mode at all | Allowed, per spec | pr-babysit `design.md:19` ("no setting that babysits without asking") | Anton, 2026-10-12: "if I indicate that it should be babysat and shipped automatically, that's a good workflow"; the per-spec value is his explicit instruction, written down |
| hold-for-review | Babysit to green, `pr hold` (label + *How to review*), stop. Nothing left running locally. Approval on GitHub → merged like auto (phase 2). Works outside a crew: §10 answer 4 → `launch babysit … hold` | Keep a local stack running for the review (Oct 11, #930); raw `gh label`/`gh pr edit` | The stack held ports for hours; Anton: "I don't want it to be running in the background and stealing the valuable CPU or RAM"; babysit's GitHub writes go through `GhWrites` |
| After merge (auto) | Merge and report. Deploy babysitting only for infra: settings `deploy: { paths, gate }`; when the PR's files match `paths`, babysit works through the gate and marks the phases deployed (`phase deployed --land`) only when the gate's last check passes, else `deploy owed` | A deploy gate after every merge (first draft); a deploy tool in the plugin | Anton, 2026-10-12: "no need for gates like actual deploy … babysitting the deploy is out of scope … UNLESS WE WORK WITH INFRA!" Non-infra deploys run on merge by themselves; update.md:49 ("never infer a deploy from a merge") stands except for a gate that proves it |
| Push | Decided once at execute §1: no PR or a draft → push now and after every commit; an open ready PR → push at the end of the chunk; lookup failed → push; merged/closed → stop | Push at handoff only (today); re-checking `pr status` on every commit (first draft) | Interrupted work is safe and visible on origin; CRM runs no CI on branch pushes or drafts (`ci.yml:76`), and a ready PR re-runs CI on every push; `pr status` verdict `none` also means a ready PR whose CI hasn't run |
| Phase 1 scope | Prose plus four small tools: `launch --bg --brief` (and babysit `hold`), `pr hold`, `phase deployed --land`, the `deploy:` setting | Prose plus two wiring changes (first draft) | A hand-typed launch line is the most repeated, most slip-prone step; Anton, 2026-10-12: "your work is investment into the codebase … fix them as you go" |
| Pause | "Time to pause" = every active worker hands off now (clean boundary, commit, push, release, stop), then the run file is saved as stood down | Killing the sessions | Nothing is lost; resume starts from saved state |
| Which rows a slot takes | Board ready rows with `next: execute`, no `treeBusy`, no `readyIn`/`onlyOn`, not a `code: false` task phase, no unanswered question, at most one worker per spec in phase 1; prep/create/review stay with Anton | Any ready row | Prep has a hard human stop; task phases are outward work for Anton; two workers on one spec conflict on spec docs until self-driving-loop phase 3 |
| Order of work | Phase 1 fast path (mostly written steps), then the crew builds phases 2–5 | Build every tool first | Value now; the first real run shows what to harden (Anton, 2026-10-12) |
| Sub-command name | `/spec oversee-crew`; spec folder `oversee-crew-spec` | `run`, `dispatch`, `conduct`, `autopilot-squad` (25 considered) | Anton picked it: "Oversee" says it watches and doesn't do the work, "crew" says there are several workers |
| Vocabulary | slot, worker, overseer, launch brief, crew line, stood down | lane, controller, brief, report, paused | Those words already mean board lanes, the controller tab (`SKILL.md:81`), `product-brief.md`, a command's output, and spec `status: paused` |

## Core flow

```
                 ┌──────────── Anton ─────────────┐
                 │ go · answers · reviews · pause │
                 └───────▲──────────────┬─────────┘
          needs-you batch│              │instructions
                 ┌───────┴──────────────▼─────────┐
 board ready ───►│  Overseer (writes no code)     │◄── roster wait: exits on a worker change
 lane            │  run.md · roster · close-out   │    (roster wait: background Bash, ≤30 min)
                 └───┬───────────────┬────────────┘
        fill a slot  │               │ PR group ready
                     ▼               ▼
         ┌──────────────────┐  ┌───────────────────────────┐
         │ Worker (claude   │  │ Babysitter (claude --bg)  │
         │ --bg, bypass,    │  │ auto: merge (infra PR:    │
         │ launch brief)    │  │   deploy gate → deployed) │
         │ /spec execute    │  │ hold-for-review: green →  │
         │ push every commit│  │   label + How to review → │
         │ in-flight + Crew:│  │   stop                    │
         └──────────────────┘  └───────────────────────────┘
```

### Starting a run
1. Anton types `/spec oversee-crew` in the project's main checkout.
2. The overseer reads the board (`spec.ts board --json`), the roster (`claude agents --json`,
   this repo's worktrees only) and any existing run file.
3. One message: slot count, the ready rows it will start, ship modes it found and the ones it
   needs. Anton answers once ("go", or changes).
4. It writes (or merges into) the run file, fills the slots, starts the roster wait.

### A worker's life
```
 launched ──► working ──► done ─────────────► close-out check ──► stop + rm ──► slot free
                 │                                   │ fails
                 │                                   └──► tell the worker (by name), or Anton
                 ├──► blocked + waitingFor ──► needs you: "claude attach <id>" + push notification
                 │       (permission prompt)       Anton answers in that tab ──► working
                 ├──► blocked, no waitingFor ──► "Hand off now" (by name) ──► done ──► close-out
                 │       (ended on text)            in-flight.md has Needs you? ──► phase parked
                 └──► gone ──► close-out; dirty tree or live claim ──► needs you
```
States come from `claude agents --json` (waves 2, 2b, 2c): `working`, `done`,
`blocked` with `waitingFor`, `blocked` without it. A babysitter holding a live `pr-<group>`
claim is waiting on CI whatever its state; it is never closed out until it releases the claim.

### The PR moment
1. A worker's `Crew:` line says its PR group is ready (all group phases ticked, pre-PR checks green).
2. The overseer checks the PR's real state (`spec.ts pr status <spec> <group>`): merged or
   closed → nothing to launch (the #901 mistake); otherwise continue.
3. Ship mode: the spec's `ship:` → the run file's answer for that spec → ask Anton once.
4. It launches a background babysitter in the group's tree with a launch brief naming the mode.
5. auto: merge on green, one line to Anton. Only a PR touching the project's `deploy.paths`
   (infra) goes on through the deploy gate, one at a time, and is marked deployed when the
   gate's last check passes.
   hold-for-review: green, `pr hold`, stop, one line to Anton.

### Needs you
Questions live in the worker's `in-flight.md` *Needs you* (committed, so any machine sees
them); the run file keeps only when each was asked and answered. The overseer batches unasked
items into one message, asks each once, records the answer with its time, and relaunches the
parked phase with the answer in its launch brief. A worker stuck on a prompt also gets a push
notification.

### Pause and resume
"Time to pause" → the overseer sends each `working` or `done` worker "Hand off now" by launch name
(workers stuck on a prompt go to needs you; babysitters finish) → each finishes its step,
commits at a clean boundary, pushes, releases its claim and stops → the overseer closes them
out, lists them under `## Stood down` and saves the run file as `stood-down`.
"Resume" → read the run file, relaunch the stood-down phases first (the board shows them in
flight, not ready), answered questions next, then refill slots from the board.

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
Merged #929 lifecycle-email-foundation A
Merged #931 infra-alarms A · deploy gate passed (crm-prod) · phases 1–2 marked deployed
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
| Worker hits the stopping rule mid-phase | Its `Crew:` line says `next same phase`; the overseer relaunches the same phase in the same tree with a fresh session |
| Worker crashes or exits without handing off | The roster shows it `stopped` or gone (a `kill -9` is restarted by the service); close-out finds the claim `closed` or the tree dirty → needs you, never a silent relaunch over half-done work |
| Worker ends its turn on text mid-unit (`blocked`, no `waitingFor`) | "Hand off now" first, so it commits at a clean boundary; never stop + rm over a dirty tree the next worker would inherit |
| Babysitter idle on `pr wait` | Its live `pr-<group>` claim means waiting; the overseer leaves it alone |
| Tree busy (`trees: <path> is busy`) | Skip that row this round; take the next one |
| Claim held by a teammate or another machine | Skip; the board's needs-you already lists stale remote claims for Anton |
| PR already merged or closed | No babysitter (the #901 case); note it once |
| CI red twice on the same failure, or red on main too | Babysit's existing §4 stop-and-ask; arrives in the needs-you batch |
| Worker ended on a question | It handed off with the question in `in-flight.md`; parked, slot freed |
| Ready row is a task phase (`code: false`) | Skipped; task phases are Anton's outward work |
| Two infra PRs merge close together | One deploy gate at a time; the second babysitter launches after the first reports |
| Worker stuck on a prompt | Needs you with `claude attach <id>`; slot stays held until it moves |
| Folder never trusted | `claude --bg` refuses ("Workspace not trusted"); needs you: open `claude` there once. Worktrees of a trusted repo inherit trust |
| Overseer compacts during a long run | It rotates: state is in the run file, roster and claims; it asks for a fresh `/spec oversee-crew` and stops |
| Overseer session closes | Workers keep running (background); `/spec oversee-crew` again resumes from the run file |
| Two overseers in one clone | The run file records the overseer's session id; a second one refuses while that session is live (not when it is this session) |
| Two workers on one spec | Not in phase 1: shared spec docs conflict until self-driving-loop phase 3 lands |
| Overseer places a fresh tree | `launch --bg` passes the `Fresh tree:` / `Setup failed:` lines into the brief, since the worker's own placement sees `existing` |
| Migration-number or other project collisions | Project-side; the overseer passes known facts as launch-brief notes, it doesn't reserve numbers |
| hold-for-review PR falls behind main while waiting | Approval (phase 2) sends it to an auto babysitter, which merges main as part of its normal flow |
| Marking deployed after a squash merge | `phase deployed --land` writes the marker on main through `landOnMain`, in any `docs:` mode; never a commit in the merged tree |
| Held PR merged by hand | Non-infra: nothing to do. Infra: the overseer launches a deploy-only babysitter |
| Machine load | Slot cap is the brake (3 + 2 by default); loadwatch shows which worker is heavy |
