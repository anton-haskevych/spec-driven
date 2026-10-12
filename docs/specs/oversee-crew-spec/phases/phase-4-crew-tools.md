---
needs: [1]
pr: D
---

# Phase 4 — Crew tools

**Goal:** The overseer's hand-run steps become `spec.ts crew launch | roster | watch | check | stop`, built on one launch builder shared with today's tab launch and a reader for `claude agents --json`.

**Outcome:** The overseer runs one command per step instead of written shell recipes, so it slips less and spends less context · the largest code phase · risk: low, since phase 1 already proved every step by hand.

**Files to touch:**
- `skills/spec/tools/launch/command-line.ts`, `skills/spec/tools/launch/background.ts` (new)
- `skills/spec/tools/sessions/agents.ts` (new), `skills/spec/tools/sessions/live.ts`
- `skills/spec/tools/commands/crew.ts` (new), `skills/spec/tools/commands/crew/{launch,roster,watch,check,stop}.ts` (new), `skills/spec/tools/spec.ts`
- `skills/spec/tools/crew/{run-state,handoffs}.ts` (new)
- `skills/spec/oversee-crew.md`
- tests: `launch.test.ts`, `launch-background.test.ts`, `sessions-agents.test.ts`, `sessions-live.test.ts`, `crew-*.test.ts`, `commands-table.test.ts`; fixtures `claude-bg-stdout.txt`, `claude-agents.json`

## Implementation guidance

technical.md → *Phase 4* and the craft wave's *Extraction wins*. Extract first, as its own
green commit: split `sessionLaunch` into a parsed launch request (sub-command, optional spec,
optional target, per-sub-command arity) and an argv builder with optional `--bg`,
`--permission-mode` and `--append-system-prompt-file`. Today's tab output must stay
byte-identical (`launch.test.ts:43-44,99-102`).

`crew launch` places the tree, writes the brief from `crew-brief.md` plus `--note` lines,
runs the argv through `Runner.run(argv, {cwd})` with no terminal, parses
`backgrounded · <id> · <name>` and prints `Launched: background <id> · <name>`.

`sessions/agents.ts` is a narrow reader (`id, sessionId, name, cwd, kind, status, state,
waitingFor`), joined to claims by `sessionId`, scoped by `ownerOf`
(`gotcha-session-files-span-every-repo`). Keep it separate from `LiveSession`, which needs
`procStart` and `updatedAt` that `agents --json` lacks; `LiveSession` only gains an optional
`kind`.

`crew watch` polls the reader on an injected clock and prints one line per change, for the
Monitor tool. `crew check` runs the five close-out checks and prints `Close-out: ok` or what
is missing. `crew stop` runs `claude stop` then `claude rm`.

Logic in pure functions with fast tests; real git only where git must prove it
(`gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`).

## Deliverables

- [ ] 4.1 Extract the launch builder (request + argv); tab output byte-identical; tests
- [ ] 4.2 `crew launch execute|babysit`: place, brief, `--bg` with bypass, parse the id; fixture `claude-bg-stdout.txt`; tests
- [ ] 4.3 `sessions/agents.ts` reader and optional `kind` on `LiveSession`; fixture `claude-agents.json`; tests
- [ ] 4.4 `crew roster`: one row per worker (id, spec and phase, state, since), joined with claims; tests
- [ ] 4.5 `crew watch`: one line per state change on an injected clock; tests
- [ ] 4.6 `crew check` (close-out) and `crew stop`; tests
- [ ] 4.7 `oversee-crew.md` uses the commands instead of the written recipes

## Phase-local notes

- `claude rm` left an externally placed worktree in place in the probes; keep a test or a
  guard that `crew stop` never removes a tree.
- Release with this PR (next minor version, ROADMAP row).
