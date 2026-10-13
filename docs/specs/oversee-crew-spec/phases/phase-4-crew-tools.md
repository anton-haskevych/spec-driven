---
needs: [1]
pr: D
---

# Phase 4 — Crew tools

> **Re-plan after the first crew run** (review 2026-10-12). Phase 1 already ships the launch.
> What follows is the direction. Rewrite the deliverables from what the first run actually
> slipped on before executing.

**Goal:** The overseer's remaining hand-run loop becomes one idempotent `spec.ts crew tick`. It applies the fixed transitions (done → close-out → stop + rm → pick → launch) and prints only what needs judgement or Anton. Alongside it come `crew wait` (the roster wait as a command) and a reader for `claude agents --json`.

**Outcome:** The overseer runs one command per wake instead of a written loop, so it slips less and spends less context.
- Shape: the largest code phase.
- Risk: low, since phase 1 already proved every step by hand.

**Files to touch:**
- `skills/spec/tools/sessions/agents.ts` (new; also owns the transcript read), `skills/spec/tools/sessions/live.ts`
- `skills/spec/tools/commands/crew.ts` (new), `skills/spec/tools/commands/crew/{tick,wait,check}.ts` (new), `skills/spec/tools/spec.ts`
- `skills/spec/tools/crew/run-state.ts` (new, only if `run.md` survives the first run as more than a few fields)
- `skills/spec/oversee-crew.md`
- tests: `sessions-agents.test.ts`, `sessions-live.test.ts`, `crew-*.test.ts`, `commands-table.test.ts`; fixture `claude-agents.json`

## Implementation guidance

technical.md → *Phase 4* and the craft wave's *Extraction wins*. If phase 1's `launch --bg`
left `sessionLaunch` crowded, split it now into a parsed launch request (per-sub-command arity)
and an argv builder, as its own green commit. Today's tab output must stay byte-identical
(`launch.test.ts:43-44,99-102`).

`sessions/agents.ts` is a narrow reader (`id, sessionId, name, cwd, kind, status, state,
waitingFor`), joined to claims by `sessionId`, scoped by `ownerOf`
(`gotcha-session-files-span-every-repo`). Keep it separate from `LiveSession`, which needs
`procStart` and `updatedAt` that `agents --json` lacks; `LiveSession` only gains an optional
`kind`.

`crew wait` polls the reader on an injected clock and exits on the first change, a gone id or
the heartbeat. It runs in background Bash like `pr wait`. `crew check` runs the close-out
checks and prints `Close-out: ok` or what is missing. `crew tick` composes them. It never stops
a session whose claim is live, and never one it didn't launch.

Logic in pure functions with fast tests; real git only where git must prove it
(`gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`).

## Deliverables

- [ ] 4.1 Re-plan from the first real crew run's slips (phase 1's dogfood run or a CRM run); rewrite 4.2–4.6 if they differ
- [x] 4.1a Fix `crew-brief.md` → *Roster wait* under zsh: run it as `bash <<'EOF' … EOF` so `$ids` word-splits (first crew run: zsh reported every worker `gone` on the first poll); own green commit
- [ ] 4.1b `spec.ts context babysit <spec> <group> hold` reads `B hold` as the group name and reports no such group (first crew run, 2.43.0); parse `hold` as a flag; test; own green commit
- [ ] 4.2 `sessions/agents.ts` reader (state, waitingFor, transcript read) and optional `kind` on `LiveSession`; fixture `claude-agents.json`; tests
- [ ] 4.3 `crew wait`: exits on the first change, a gone id or the heartbeat, on an injected clock; tests
- [ ] 4.4 `crew check`: the close-out checks, including the babysitter rows; tests
- [ ] 4.5 `crew tick`: fixed transitions, judgement items printed; never touches a live-claim or foreign session; tests
- [ ] 4.6 `oversee-crew.md` uses the commands instead of the written recipes

## Phase-local notes

- `claude rm` left an externally placed worktree in place in the probes; keep a test or a
  guard that `crew tick` never removes a tree.
- Version picked at merge, ROADMAP row.
- First crew run slip (2026-10-12): the roster wait recipe assumed bash; Bash-tool shells are zsh,
  where `for id in $ids` doesn't split, so every id read as `gone`. 4.3's `crew wait` takes ids as
  argv, never a shell-split string.
