---
needs: []
pr: A
---

# Phase 1 — The overseer, fast path

**Goal:** `/spec oversee-crew` runs a crew of background workers and babysitters from written steps on today's tools, every session pushes from its first commit, and babysit can hold a PR for review or run the project's after-merge gate.

**Outcome:** You can run a crew in CRM the day 2.43.0 ships: type `/spec oversee-crew`, say how many workers, and it runs; you answer questions and review held PRs · mostly written instructions, two small code changes · risk: the overseer follows written steps, so it can slip the way Oct 11 did, and the close-out check plus the run file are what catch it.

**Files to touch:**
- `skills/spec/oversee-crew.md` (new), `skills/spec/crew-brief.md` (new)
- `skills/spec-oversee-crew/SKILL.md` (new, copy of `skills/spec-babysit/SKILL.md`)
- `skills/spec/SKILL.md` (:4 argument-hint, :38 set line, dispatch table, :51 exceptions, *Tools* → Settings line)
- `skills/spec/execute.md` (§1 after *Claim the phase*, §6 step 5, §10, new *Crew worker* paragraph)
- `skills/spec/babysit.md` (mode lookup, §3, Rules), `skills/spec/handoff.md` (§3, §4)
- `skills/spec/tools/context/request.ts` (`SUB_COMMANDS`), `skills/spec/tools/playbook/settings.ts`, `skills/spec/tools/commands/context.ts:108`
- `skills/spec/tools/tests/skill-wiring.test.ts` (:87, :92), `launch.test.ts` (:112), settings tests
- `docs/specs/_playbook/gates.md` (new), `docs/specs/_playbook/settings.md`, `README.md`, `ROADMAP.md`, version files

## Implementation guidance

technical.md is the contract: the run file, the launch command, the launch brief, the
handoff note, the watcher, the close-out check and every mode-file change are spelled out
there. This phase writes them into the skill; it adds no crew tool code (phase 4 does).

Order: wiring first (1.1) so `/spec oversee-crew` dispatches; then the mode file section by
section (1.2–1.9, each section one commit, each readable on its own); then the worker-side
changes that every session gets (1.10–1.12); then this repo's own deploy gate and the release
(1.13). The overseer procedure leans on the four worker states verified in waves 2b and 2c
(`working`, `done`, `blocked` + `waitingFor`, `blocked` alone): keep that table verbatim in the
mode file, it is what replaces Oct 11's idle notices.

Write the mode file the way `babysit.md` is written: a *How to run the commands* table
(which call is foreground, which goes to Monitor), "the last stdout line is the result",
then numbered sections. The overseer's own rules belong near the top:
- It writes no code and never commits in a worker's tree.
- It never merges a hold-for-review PR, never runs `claim take --take-over`, never acts on a
  teammate's claim, never takes an outward or irreversible step.
- It names workers by name and id, never by tab number.
- It reports one line per merge, deploy or hold, plus the needs-you batch, and nothing else
  unprompted.
- After a compaction it re-reads the run file and the roster before acting.

`claude --bg` probes (waves 2, 2b, 2c) settled the launch: run it from the placed tree,
read the id from `backgrounded · <id> · <name>`, never rely on `--session-id`. The first
real launch in this phase confirms `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF=1` stops a worker's
background shells on `claude stop`; if it doesn't, the handoff's *stop your servers* step is
the only guard and the launch line drops the variable.

The push change applies to every session: after `claim take` in execute §1 and after each
commit in §6. The one exception is a branch with an open ready PR, where every push restarts
CI (`decision-handoff-before-babysit-launch` in pr-babysit's ledger); there the push moves
to the end of the chunk. Babysit's own fix pushes stay as they are.

hold-for-review in babysit replaces §3's merge with: label, *How to review*, `pr log
--stopped "held for review"`, claim release, report. The after-merge gate follows the
existing gate pattern: a settings key naming a `gates.md` section
(`gates.after-merge: deploy`), expanded with `spec.ts gates --name`. This repo gets its own
`## deploy` section (sync the marketplace clones so installed sessions get the new version),
which makes this PR the first user of it.

## Deliverables

- [ ] 1.1 Register `oversee-crew`: `SUB_COMMANDS`, SKILL.md argument-hint, set line, dispatch row and exceptions (no spec inferred), thin skill `skills/spec-oversee-crew/SKILL.md`; widen the wiring-test regexes to accept `-`; update the launch-test sub-command list
- [ ] 1.2 `oversee-crew.md` *Start*: read board, roster and any run file; refuse when another live overseer owns the run file; the one start message (design.md → Copy); write `run.md`
- [ ] 1.3 `oversee-crew.md` *Fill a slot*: the pick rule, `trees place --json`, the brief file, the `claude --bg` launch line with bypass permissions, record the id
- [ ] 1.4 `crew-brief.md`: the launch brief template for workers and babysitters (technical.md → *Launch brief*)
- [ ] 1.5 `oversee-crew.md` *Watch*: the Monitor watcher, the self-paced `/loop` with a 1800 s `ScheduleWakeup` heartbeat, and the state → action table
- [ ] 1.6 `oversee-crew.md` *Close out*: the five checks, `claude stop` + `claude rm`, what to do when a check fails
- [ ] 1.7 `oversee-crew.md` *PR moment*: `pr status` before any babysitter, the ship-mode lookup order, the babysitter launch in the group's existing tree
- [ ] 1.8 `oversee-crew.md` *Needs you*: questions from handoff notes and blocked workers into `run.md`, one batch, each asked once, answers recorded and passed to the relaunch brief; `claude attach <id>` lines; PushNotification for blocked workers
- [ ] 1.9 `oversee-crew.md` *Pause and resume*: "Hand off now" to each worker, wait for `done`, close out, `state: stood-down`; resume from `run.md`
- [ ] 1.10 execute.md: push after `claim take` and after every commit (ready-PR exception); the *Crew worker* paragraph (brief rules win over §10's question and *Next sessions*)
- [ ] 1.11 babysit.md + execute.md §10: hold-for-review mode (4th answer, label, *How to review*, stop); `gates.after-merge` setting (parser row, field, `Settings:` line, tests); after merge: gate, `phase deployed`, `publish-docs` in `docs: main` projects
- [ ] 1.12 handoff.md: crew handoff note (technical.md → *Worker handoff note*); stop servers and watchers this session started, for every session
- [ ] 1.13 This repo's `docs/specs/_playbook/gates.md` `## deploy` (marketplace sync) and `gates.after-merge: deploy`; README sub-command list; ROADMAP section; `python3 scripts/version.py --set 2.43.0`

## Phase-local notes

- `babysit.md` forbids Monitor, loops and ScheduleWakeup for babysitters; the overseer is a
  different job and uses exactly those. Say so in `oversee-crew.md` so nobody "fixes" one by
  copying the other.
- `docs: branch` projects can't land the deployed marker after a squash merge from the merged
  tree; phase 1 reports it as owed, phase 2 adds `phase deployed --land`.
- Workers launched in a folder that was never trusted refuse to start; worktrees of a trusted
  repo are fine (wave 2). Surface the refusal as needs you.
- Lesson `gotcha-execute-section-0-is-skipped-on-the-resume-path`: the push-at-start step goes
  in §1, after the claim, never §0.
