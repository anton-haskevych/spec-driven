---
date: 2026-10-12
wave: 0
lens: inherited
slug: oct-11-crew-run
from: CRM controller session 25c8ad1a (crm-93) + its 25 worker/babysit sessions, 2026-10-11 13:15 → 18:41 PDT
brief: product-brief.md
---

# Recon Wave 0 — the Oct 11 crew run

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Six read-only agents read digests of the controller and all 25 sessions it launched
(scratchpad digests, session-scoped; the counts below are the durable record). One
claude-code-guide consult plus a local check of Claude Code 2.1.296. One Explore map of
this repo.

## What the run did
- Controller (no code) ran 3 execute lanes + ≤2 babysitters on a self-paced `/loop`
  (~30 min heartbeat) plus `SendMessage {notify_when_idle}` watches. Shipped #927, #890,
  #929 to prod; #930 opened for Anton's review (ship mode "review", set mid-run).
- Standing go lived in CRM memory `project_three_lane_orchestration.md` (lanes, cap,
  "babysit every PR", delegated design approvals, #930 exception, pause state).
- Kept-as-is mechanics: per-handoff check (tree clean, HEAD = remote, phase ticked on
  `origin/main`, claim released); per-wake `ListAgents`, `claim list`, behind-main count
  per lane; workers ack merges with numbers; deploy diff from `origin/main` with
  attribution of each change to this PR vs other undeployed main code; post-deploy
  15-min Errors/Throttles watch + canary send; then `phase deployed`; pause = tell each
  live worker "finish the step, handoff, stop", stop the loop, save resume state.

## Failures that shape the design
1. **Authority by message fails.** Workers refused relayed approvals (#890 babysit,
   Academy 20: "can't verify a delegation it only hears from another session"); the
   controller stretched the standing go once. Claude Code itself tells receivers a peer
   message is never consent. → approvals must be readable by the worker from the repo;
   each human gate says who may pass it.
2. **Instructions after launch.** Merge order, migration numbers, ship mode and the
   deploy stop rule arrived by message after the worker started; the stop rule landed
   after crm-prod deployed 10 Lambdas. One message reached the old session of a reused
   name. → a written launch brief; unique session identity.
3. **Lost or repeated questions.** Parking-notes question (ML 5a) never reached Anton;
   CLF-1 title question dropped; Mindbody full-pull go asked ~8 times; "needs you" lines
   left in unwatched tabs. → structured handoff report (done / needs you / deploy notes)
   into one queue, each question asked once.
4. **Slots idle on Anton.** Ship-mode question idle 16 min–1 h (LEF-3, CLF-1); design
   gate idle ~14 min (ABM-20); CLF-1 said "keeping on meanwhile" then went idle. →
   ship mode decided in the spec; real park + free the slot.
5. **Local resources.** 5b's review stack (`dev:all`, :3000/:4800, MySQL :3306) ran for
   hours and blocked other trees' `api:regen`; CLF-1's `next dev` ran 1.5 h through a
   wait; CS-8 left a stack up. → review mode runs no server; handoff tears down servers
   the session started.
6. **Deploy unowned.** Every babysitter got a hand-written post-merge runbook; deploy
   kinds differ (none / auto-on-merge workflow / CDK stacks / blue-green) and nothing
   declares which; CLF babysit merged with no deploy check. (Later work.)
7. **Cross-lane collisions.** Global V55 claimed by two open branches; stacked branches
   (PR B on A, C on A, D on B+C) re-merged every session; upstream red (lint, ratchet,
   API-breaking lock) surfaced in downstream lanes; another spec's docs conflicted on
   merge; conflict markers committed once. (Project-side checks, later.)
8. **Stale facts.** Babysitter launched for #901, merged by Anton 4 days earlier;
   `/loop` prompt args stayed the same all evening while lanes moved. → check PR state
   before launch; loop reads state from a file each wake.
9. **Session plumbing hand-rolled.** Close = `ps | rg 'claude -n'` + kill + osascript
   tab loop (failed once on shifting tab indexes); peek = osascript `contents of current
   session`; tab numbers (⌘6) drifted all evening; new session not addressable right
   after launch (`sleep` blocked by hook); duplicate/stale idle notices; exit notices
   for sessions the controller killed itself.
10. **Anton still drove it.** Typed "check in with the agents and decide" 5 times; asked
    about leftover zsh tabs; changed #930 to review mid-run.
11. **Startup cost.** Phase 5a took 4 sessions; ~25% of each went to re-reading mode
    files, recon and preflight before code (self-driving-loop phase 4 territory).

## Claude Code features (verified locally, 2.1.296)
- `claude --bg` starts a background session and prints its id; `claude agents --json`
  lists interactive and background sessions (`pid, cwd, kind, startedAt, sessionId,
  name, status`); `claude attach <id|name>` opens one in the current terminal;
  `claude stop|kill <id>` stops it (conversation kept); `claude logs`, `claude rm`.
- `--session-id <uuid>` (choose identity up front), `-n` name,
  `--append-system-prompt[-file]` (launch brief), `--settings`, `--permission-mode`,
  `--model`, `--effort`.
- Guide notes (docs, not locally verified): background sessions get their own worktree
  unless `worktree.bgIsolation: "none"`; they wait with "Needs input" on permission
  prompts; peer messages are previews between tool calls, never consent;
  `notify_when_idle` is one-shot and fires at once if the target is already idle;
  sockets die with the process (address by name, never by socket);
  `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF=1` stops background shells with the process;
  `PushNotification` for needs-you events; Monitor tool for streaming CI/file events;
  agent teams still unsafe (#47930 open).

## Repo map (Explore, file:line in its report)
- Callable today: `board --json` (lanes, ready rank, flight `session` + `pr` cells),
  `ready`, `launch execute|babysit` (places the tree; refuses extra tokens,
  `T/launch/command-line.ts:19-40`), `claim`, `trees`, `pr status|open|wait|rerun|merge|log`,
  `phase deployed`, `doctor`, `settings`, `context`.
- Missing: worker identity (no `claim list --json`, no sessions command); done vs stuck
  vs asking (only idle + 2-day threshold, `T/board/attention.ts:14`); handoff check;
  park / needs-human marker on a phase; ship mode storage (only project
  `pr.draft|merge`); `reviewDecision` not read (`T/pr/gh.ts:19`); deploy after merge;
  dev-server stop; slot cap setting; task-phase flag on ready rows.
- PR question lives in `skills/spec/execute.md:157-171` (babysit / draft / merge now);
  `docs/specs/pr-babysit/design.md:19` rejected "a setting that babysits without
  asking" — Anton's per-spec `ship: auto` reverses it deliberately (2026-10-12).
- Green ready PR with no claim renders `#n checks pass → merge`
  (`T/board/joins.ts:93-97`): wrong label for a review-mode PR.
- self-driving-loop phase 1 (ready-row titles, `next:"review"`, defaults/forks split)
  should land first; phase 3 (no collisions) before several workers share one spec.
  Shared files: `SKILL.md` Next sessions + Session lifecycle, `handoff.md`,
  `execute.md` §10, `T/board/model.ts`, `T/board/lanes.ts`.
- Stale claim: `self-driving-loop#1` held since 2026-10-10 20:36, no commits.

## Neighbors
- self-driving-loop — `needs` its phase 1; `same-files-as` risk on mode files.
- pr-babysit — `related`; ship mode extends its question and babysit procedure.
- spec-board / active-work-view — `related`; the overseer reads the board, adds a
  needs-you kind ("awaiting review").

## Still open (aims Wave 1)
- Workers as `--bg` sessions vs iTerm tabs: does `--bg` honour our `trees place`
  worktree (bgIsolation), skills/hooks, and can Anton jump in (`attach`) cleanly?
- Where the standing go and run state live (`docs/specs/_crew/`? local-only under the
  git common dir?) and what is committed vs per-machine.
- Ship mode field: spec `CLAUDE.md`, `pr-opening.md`, or per PR group.
- The handoff report shape and how the overseer receives it (file vs message).
- Human-gate marker on phases (design go, outward/irreversible step) and who may pass it.
