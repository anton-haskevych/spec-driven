---
needs: [1]
pr: D
---

# Phase 4 — Crew tools

> **Re-planned after the first crew run** (2026-10-12, 4.1). Slips: the roster wait under zsh (4.1a),
> babysit's `hold` read into the group name (4.1b), a resumed overseer taking its own parked tab for
> another live overseer and stopping (4.2a), and `run.md` hand edits duplicating lines (4.2a, 4.4a).

**Goal:** The overseer's remaining hand-run loop becomes one idempotent `spec.ts crew tick`. It applies the fixed transitions (done → close-out → stop + rm → pick → launch) and prints only what needs judgement or Anton. Alongside it come `crew wait` (the roster wait as a command) and a reader for `claude agents --json`.

**Outcome:** The overseer runs one command per wake instead of a written loop, so it slips less and spends less context.
- Shape: the largest code phase.
- Risk: low, since phase 1 already proved every step by hand.

**Files to touch:**
- `skills/spec/tools/sessions/agents.ts`, `sessions/transcript.ts` (new), `skills/spec/tools/sessions/live.ts`
- `skills/spec/tools/commands/crew.ts` (new), `skills/spec/tools/commands/crew/{overseer,wait,check,launch,tick}.ts` (new), `skills/spec/tools/spec.ts`
- `skills/spec/tools/crew/` (new): `run-state.ts` (run.md read + write), pure steps for wait, close-out and tick
- `skills/spec/oversee-crew.md`, `skills/spec/crew-brief.md`
- tests: `sessions-agents.test.ts`, `sessions-transcript.test.ts`, `sessions-live.test.ts`, `crew-*.test.ts`, `commands-table.test.ts`; fixture `claude-agents.json`

## Implementation guidance

technical.md → *Phase 4* and the craft wave's *Extraction wins*. If phase 1's `launch --bg`
left `sessionLaunch` crowded, split it now into a parsed launch request (per-sub-command arity)
and an argv builder, as its own green commit. Today's tab output must stay byte-identical
(`launch.test.ts:43-44,99-102`).

`sessions/agents.ts` is a narrow reader (`id, sessionId, name, cwd, kind, status, state,
waitingFor`), joined to claims by `sessionId`, scoped by `ownerOf`
(`gotcha-session-files-span-every-repo`). Keep it separate from `LiveSession`, which needs
`procStart` and `updatedAt` that `agents --json` lacks. `LiveSession` gains `parkedJobId` (4.2a)
rather than `kind`, which nothing reads yet.

`run.md` survives as more than a few fields (frontmatter, `## Launched`, `## Questions`,
`## Stood down`, `## Log`), so `crew/run-state.ts` owns reading and writing it: the overseer never
hand-edits `## Launched` or `## Log` again. `crew overseer` answers whose run it is: a recorded id
whose session file has `parkedJobId` is that job's (a tab sent to the background goes on under a
new id, `gotcha-session-id-can-change-mid-session`), so a resumed overseer takes its own run over.
`crew launch` writes the brief from crew-brief.md's template, places the tree in-process (so the
brief names it), launches `--bg` and records the id: tick and the overseer's judgement launches
(PR moment, answered questions, stood-down rows) share it.

`crew wait` polls the reader on an injected clock and exits on the first change, a gone id or
the heartbeat. It runs in background Bash like `pr wait`. `crew check` runs the close-out
checks and prints `Close-out: ok` or what is missing. `crew tick` composes them. It never stops
a session whose claim is live, and never one it didn't launch.

Preflight amendments (`research/phase-4/2026-10-12-4.2a-preflight.md`): `LaunchTitle.group` for
babysit titles first (tick and the board both miss babysitters today); `crew launch` shares an
extracted place-and-launch step with `commands/launch.ts`, and `launchInBackground` returns the id as
data; tick reads one `loadBoardInputs`; claims matched by key, never session id; `## Launched` times
are full ISO with offset.

Logic in pure functions with fast tests; real git only where git must prove it
(`gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`).

## Deliverables

- [x] 4.1 Re-plan from the first real crew run's slips (phase 1's dogfood run or a CRM run); rewrite 4.2–4.6 if they differ
- [x] 4.1a Fix `crew-brief.md` → *Roster wait* under zsh: run it as `bash <<'EOF' … EOF` so `$ids` word-splits (first crew run: zsh reported every worker `gone` on the first poll); own green commit
- [x] 4.1b `spec.ts context babysit <spec> <group> hold` reads `B hold` as the group name and reports no such group (first crew run, 2.43.0); parse `hold` as a flag; test; own green commit
- [x] 4.2 `sessions/agents.ts` reader (state, waitingFor) and `sessions/transcript.ts` (the last turn's text, for the `Crew:` line); fixture `claude-agents.json`; tests
- [x] 4.2a `crew/run-state.ts` (read + write run.md; `## Log` capped at 30) and `crew overseer` (follows a parked tab's `parkedJobId` to its job; `LiveSession.parkedJobId`); replaces crew-brief.md's liveness script; tests
- [x] 4.3 `crew wait <id…>`: ids as argv; exits on the first change, a gone id or the heartbeat, on an injected clock; tests
- [x] 4.4 `crew check <id>`: the close-out checks, including the babysitter rows; tests
- [x] 4.4a `LaunchTitle.group` for babysit titles (own commit), then `crew launch execute <spec> <phase> | babysit <spec> <group> [hold] [--note <text>]`: brief from the template, placement, `--bg` launch, `## Launched` entry; tests
- [x] 4.5 `crew tick`: fixed transitions, judgement items printed; never touches a live-claim or foreign session, never removes a tree; tests
- [ ] 4.6 `oversee-crew.md` and `crew-brief.md` use the commands instead of the written recipes

## Phase-local notes

- `claude rm` left an externally placed worktree in place in the probes; keep a test or a
  guard that `crew tick` never removes a tree.
- Version picked at merge, ROADMAP row.
- First crew run slip (2026-10-12): the roster wait recipe assumed bash; Bash-tool shells are zsh,
  where `for id in $ids` doesn't split, so every id read as `gone`. 4.3's `crew wait` takes ids as
  argv, never a shell-split string.
