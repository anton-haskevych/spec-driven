---
needs: []
pr: A
---

# Phase 1 — The overseer, fast path

**Goal:** `/spec oversee-crew` runs a crew of background workers and babysitters from written steps plus a few small tools. Every session pushes from its first commit. babysit can hold a PR for review, and runs a deploy gate only for infra PRs.

**Outcome:** You can run a crew in CRM as soon as this release is installed. Type `/spec oversee-crew`, say how many workers, and it runs. You answer questions and review held PRs.
- Shape: mostly written instructions, plus four small tools (`launch --bg`, `pr hold`, `phase deployed --land`, the `deploy:` setting).
- Risk: the overseer follows written steps, so it can slip the way it did on Oct 11. Derived state and the close-out check are what catch it.

**Files to touch:**
- `skills/spec/oversee-crew.md` (new), `skills/spec/crew-brief.md` (new)
- `skills/spec-oversee-crew/SKILL.md` (new, a copy of `skills/spec-babysit/SKILL.md`)
- `skills/spec/SKILL.md`:
  - :4 argument-hint, :38 set line, dispatch table, :51 exceptions
  - *Session lifecycle* (overseer rotation)
  - *Tools* → Launch, Remote, Settings lines
- `skills/spec/execute.md`: §1 push decision after *Claim the phase*, §6 step 5, §10 answer 4, new *Crew worker* paragraph
- `skills/spec/babysit.md` (mode, §3 hold, infra deploy, babysitter rules), `skills/spec/handoff.md` (§4 crew branch), `skills/spec/update.md` (:49)
- `skills/spec/tools/context/request.ts` (`SUB_COMMANDS`)
- `skills/spec/tools/launch/{command-line,terminal}.ts`, `launch/background.ts` (new), `commands/launch.ts`
- `skills/spec/tools/pr/actions/hold.ts` (new), `commands/pr.ts`
- `skills/spec/tools/phases/deployed.ts`, `commands/phase.ts`
- `skills/spec/tools/playbook/settings.ts`, `doctor/settings.ts`
- tests:
  - `skill-wiring.test.ts` (:87, :92), `launch.test.ts` (:112, plus the background cases)
  - settings and doctor tests, a `pr hold` test, `phase deployed --land` tests (real git, few)
  - fixture `tests/fixtures/claude-bg-stdout.txt`
- `README.md`, `ROADMAP.md`, version files (version picked at merge: main's minor + 1)

## Implementation guidance

technical.md is the contract. It spells out:
- where each piece of state lives (*One home per piece of state*)
- the launch, the brief, the crew lines in *Signal completion*
- the roster wait, the state table, the close-out check
- pause, rotation, the PR moment, deploy, and every mode-file change

Review `reviews/2026-10-12-state-homes-and-worker-lifecycle.md` explains why each looks the way it does.

**Order:**
1. Probes first (1.0). Their answers settle the state table's unprobed rows.
2. Wiring (1.1).
3. The tools (1.2–1.4), each its own TDD commit.
4. The worker-side prose every session gets (1.5–1.7).
5. The overseer mode file, section by section (1.8–1.12).
6. Release (1.13).

**Write the mode file the way `babysit.md` is written:**
- a *How to run the commands* table: which call is foreground, and which is background Bash (the roster wait)
- "the last stdout line is the result"
- then numbered sections
- keep it under 200 lines; templates (run-file skeleton, roster-wait script, brief) go in `crew-brief.md`

**The overseer's own rules go near the top:**
- It writes no code and never commits in a worker's tree.
- It acts only on session ids it launched. It never stops a session whose claim is live.
- It never merges a hold-for-review PR, never runs `claim take --take-over`, never acts on a teammate's claim, and never takes an outward or irreversible step.
- It names workers by name and id, never by tab number. Messages go by launch name (SendMessage can't address an id; probes 1.0).
- It reports one line per merge, deploy or hold, plus the needs-you batch, and nothing else unprompted.
- On compaction it rotates (technical.md → *Overseer rotation*).
- Record the Claude Code version the probes ran on, so a CLI change is obvious when a run misbehaves.

**Waiting.** The overseer waits with the roster wait in background Bash, the same primitive as `pr wait`. Don't use Monitor or `/loop`; babysit.md bans both for the same reasons. Say so in `oversee-crew.md` so nobody "fixes" it later.

**Push rule.** The push decision is made once at execute §1, from a cheap PR lookup, and applies to every session:
- no PR, or a draft: push after every commit
- an open ready PR: push at the end of the chunk, because each push restarts CI (`decision-handoff-before-babysit-launch` in pr-babysit's ledger)
- a failed lookup: push

Babysit's own fix pushes stay as they are.

**Deploy.** A deploy happens only for infra (Anton, fork B). This repo has no infra and gets no `deploy:` setting. CRM's comes in phase 6.

**Fix as you go** (Anton, 2026-10-12). Rotten code or bugs found next to this work get fixed in their own commit and named in the handoff.

## Deliverables

- [x] 1.0 Probes on the installed CLI, recorded in `research/phase-1/`:
  - a `--bg` session idle on a background shell: its `state`, and whether it is re-invoked when the shell exits
  - SendMessage to a `--bg` session by id, while `working` and while `done`
  - the state after `kill -9`
  - whether `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF=1` stops background shells on `claude stop`
  - whether `claude rm` deletes the transcript
  - Update technical.md's state table from the answers.
- [x] 1.1 Register `oversee-crew`:
  - `SUB_COMMANDS`; SKILL.md argument-hint, set line, dispatch row and exceptions (no spec inferred)
  - the thin skill `skills/spec-oversee-crew/SKILL.md`
  - `launchTarget` refuses `oversee-crew`
  - widen the wiring-test regexes to accept `-`; update the launch-test sub-command list
- [x] 1.2 `launch execute|babysit … --bg --brief <file>`:
  - background argv run from the placed tree
  - appends the placement's fresh-tree and setup lines to the brief
  - parses `backgrounded · <id> · <name>` and prints `Launched: background <id> · <title>`
  - `launch babysit <spec> <group> hold` passes `hold` into the prompt, with or without `--bg`
  - tab output stays byte-identical
  - fixture, tests
- [ ] 1.3 `pr hold <n> --how-to-review <file>`: label (created if missing) plus a *How to review* body section through `GhWrites`; tests
- [ ] 1.4 Settings and deployed marker:
  - `deploy: { paths, gate }`: parser row, typed field, `Settings:` line, doctor gate check
  - `phase deployed --land` through `landOnMain`
  - tests
- [ ] 1.5 execute.md:
  - §1 push decision after `claim take`, plus §6 step 5 push
  - the *Crew worker* paragraph (the single list of crew rules)
  - §10 answer 4 → `launch babysit … hold`
- [ ] 1.6 handoff.md §4 *Crew worker* branch first (`Crew:` line, `Handed off.`, no question, no *Next sessions*, servers stopped); update.md:49 infra exception; SKILL.md *Session lifecycle* overseer rotation
- [ ] 1.7 babysit.md:
  - mode from `hold`, else `ship:`, else auto
  - hold → `pr hold`, `pr log --stopped`, release, end
  - auto → infra deploy gate only when `deploy.paths` match: marker only when its last check passes, else `deploy owed`
- [ ] 1.8 `oversee-crew.md` *Start* and `crew-brief.md`:
  - read board, roster and any `run.md` (resume merges, never overwrites)
  - refuse when another live overseer owns the run
  - the one start message (design.md → Copy)
  - brief template, run-file skeleton, roster-wait script
- [ ] 1.9 `oversee-crew.md` *Fill a slot*: the pick rule, `launch … --bg --brief`, `## Pending`
- [ ] 1.10 `oversee-crew.md` *Wait and act*:
  - the roster wait in background Bash and the state → action table (incl. babysitter rows)
  - close-out, `stop` + `rm`
  - only launched ids
- [ ] 1.11 `oversee-crew.md` *PR moment* and *Needs you*:
  - `pr status` first; ship-mode lookup; babysitter launch; one infra deploy at a time
  - questions from `in-flight.md` *Needs you*, asked once, answers in `run.md` and the relaunch brief
  - `claude attach <id>` plus PushNotification
- [ ] 1.12 `oversee-crew.md` *Pause, resume, rotate*:
  - "Hand off now" by launch name; prompt-blocked workers go to needs you; babysitters finish
  - `## Stood down`; resume relaunches those first
  - rotation on compaction
- [ ] 1.13 README sub-command list, ROADMAP section, `python3 scripts/version.py --set <main's minor + 1>` at merge

## Phase-local notes

- Workers launched in a folder that was never trusted refuse to start, while worktrees of a trusted repo are fine (wave 2). Surface the refusal as needs you.
- Lesson `gotcha-execute-section-0-is-skipped-on-the-resume-path`: the push decision goes in §1, after the claim, never in §0.
- Anton's worktree file guard blocks Write/Edit from a worktree to any main-repo path, including `.git/`. Nothing a worker writes may live under `<git-common-dir>`; spec.ts commands may write there, since they run as Bash.
