---
date: 2026-10-12
lens: craft
slug: naming-fixtures-extraction
brief: product-brief.md
---

# Craft Wave — naming, fixtures, extraction

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Three Explore agents over the wave 0–2 touch-set. `T/` = `skills/spec/tools/`.

## New files, named and placed against exemplars
| Piece | Place | Exemplar |
|---|---|---|
| Overseer mode file | `skills/spec/oversee-crew.md` | `skills/spec/babysit.md` (command table, last stdout line is the result) |
| Thin skill | `skills/spec-oversee-crew/SKILL.md` | `skills/spec-babysit/SKILL.md` verbatim; `disable-model-invocation: true`, no hooks |
| Tool dispatcher | `T/commands/crew.ts` (key `crew` in `T/spec.ts:28-47`) | `T/commands/pr.ts` (`ACTIONS`, joined `*_USAGE`, `usage:` fallback) |
| One file per action | `T/commands/crew/<verb>.ts` exporting `CREW_<VERB>_USAGE` + `crew<Verb>` | `T/commands/pr/*.ts` |
| Background launch argv + parse `backgrounded · <id> · <name>` | `T/launch/background.ts` | `T/launch/command-line.ts` (`shellQuote`, `SKILL_COMMAND`) |
| `claude agents --json` reader (narrow type: id, sessionId, name, cwd, status, state) | `T/sessions/agents.ts` | client shape `T/pr/gh.ts`; JSON via `parseJson` `T/pr/gh-records.ts:5` |
| stop / rm | `T/sessions/stop.ts` | runner injection `T/commands/launch.ts:17` |
| Run state, question queue, worker handoff files | `T/crew/run-state.ts`, `T/crew/questions.ts`, `T/crew/handoffs.ts` under `stateDir(git, "crew")` (`T/core/git.ts:48`) | one file per item `T/claims/store.ts:37-38` + `T/claims/atomic-file.ts` |
| Spec field `ship:` | `SHIP_MODES` + `ShipMode` + `readShipField` in `T/core/spec-meta.ts`; doctor line in `T/doctor/spec-meta.ts` | `FOCUS_BANDS` / `readFocusFields` (`spec-meta.ts:4-6,44-61`) |
| Phase gate key | field on `PhaseState` read in `loadPhase` (`T/core/spec-state.ts:62-63`); validator `T/doctor/phase-gates.ts` wired into `T/hooks/spec-file-check.ts:63-73`; tick refusal beside `checkEvidence` (`T/phases/tick.ts:50-55`). NOT in `EDGE_KEYS` | `code` / `playbook`; `T/doctor/task-phases.ts:18-20` wording |
| Standing go | a section in `docs/specs/_playbook/settings.md`: one `SECTION_KEYS` row + typed block + default (`T/playbook/settings.ts:11-30,50-59`); kebab keys in file, camel in TS; `Settings:` line `T/commands/context.ts:108` | `pr`, `gates` sections |
| Needs-you kinds | union `T/board/model.ts:76-86` (kebab nouns), producer in `T/board/attention.ts:19`, render in `T/board/render.ts:89-97` as `["<state> → <action>", row]` | `remote-claim`, `idle-claim` |

Tests: flat `T/tests/<folder>-<file>.test.ts` (`sessions-agents`, `launch-background`,
`crew-questions`, `crew-handoffs`, `crew-run-state`).

## Words to avoid (already taken)
- **lane** = board lanes; use **slot** for a worker place.
- **controller** = `SKILL.md:81` controller tab; use **overseer**.
- **review** = the `review` sub-command and self-driving-loop's `next: review`; the PR
  state is **awaiting review** (kind e.g. `pr-review`, line `#n awaiting review`); the ship
  mode value needs a name that reads as a PR action (decision for create).
- **brief** = `product-brief.md`; say **launch brief**.
- **report** = a command's printed output (`*Report`); the worker artifact is a **handoff**.
- **paused** = spec `status: paused`; **stopped** = babysit log event; overseer
  pause/resume needs another word (e.g. **stand down / resume**).
- Free: worker, park, crew, oversee, roster, ship, slot, queue.

## Fixtures: reuse vs create
- Reuse: `stubRunner` / `asyncStubRunner` / `sequencedRunner` / `routeGh` / `cannedGh`
  (`T/tests/stub-runner.ts`), `isolatedRunner` + `repoWithOrigin` (`T/tests/git-repo.ts`),
  `createTree` (`T/tests/tree.ts`), `fakeClock`, `factories.ts` (`liveSession`, `claim`,
  `heldClaim`, `phaseState`, `phaseEdges`, `specMeta`), `board-factories.ts` (`readyRow`,
  `flightRow`, `board`, `prRow`, `boardInputs`), `pr-factories.ts`.
- Create: `T/tests/fixtures/claude-bg-stdout.txt` (captured `backgrounded · …` block),
  `T/tests/fixtures/claude-agents.json` (one background + one interactive row); optional
  `session-bg.json` (or `session({kind:"bg"})` in `sessions-live.test.ts`); a subprocess
  script beside `claim-taker.ts` only if a queue race needs proving.
- Pins that move: `pr-gh-lists.test.ts:17` (`OPEN_FIELDS`), `board-command.test.ts:35`
  and `board-lanes.test.ts:115` (`BOARD_VERSION`, share one bump with self-driving-loop
  phase 1), `launch.test.ts:112` (sub-command list), `skill-wiring.test.ts:87,92` (allow
  `-`). `board-no-focus-golden.test.ts` must stay green (new kinds add no line without data).
- Real-git tests cost 0.5–1 s each: logic in pure parsers, few real-repo tests.

## Extraction wins
1. **One launch builder** (`T/launch/command-line.ts:18-40`): split into a parsed launch
   request (sub-command, optional spec, optional target; per-sub-command arity) and an
   argv builder with optional `--bg` / `--append-system-prompt-file`. `--bg` runs argv
   through `Runner.run(argv, {cwd})` (`T/core/run.ts:8`), no terminal. Keep default
   output byte-identical (`launch.test.ts:43-44,99-102`).
2. **`kind` on `LiveSession`** (`T/sessions/live.ts:34-57`), optional; the `agents --json`
   reader stays a separate narrow type joined by `sessionId` (it lacks `procStart` /
   `updatedAt`). Scope by `ownerOf` (`T/sessions/by-workspace.ts:4-10`).
3. **Export `attentionCells`** (`T/board/render.ts:89-98`) and add a text view for
   *Next sessions* over the same `Board` (tree from `ReadyRow.target`; `title` from
   self-driving-loop phase 1) — ends the per-handoff `board --json | python` re-parse.
4. **Exhaustive needs-you render switch:** explicit `deploy` branch + `never` check
   (`render.ts:97` falls through to "not deployed → deploy" today).
5. **`pushBranch` per commit as-is** (`T/publish/push.ts:18-38`); optional skip-fetch.
   The "ready PR, CI running" guard stays outside it (a `pr status` question).
6. **Handoff file** = the printed *Signal completion* fields (`handoff.md:156-172`) written
   to `stateDir`; one ~10-line tmp-then-rename helper is the only new primitive.

## Don't extract
- Multi-file `landOnMain` (every write is one file).
- A `local.md` merge writer (`setFrontmatterLine` exists; standing go lives in settings).
- A needs-you kind registry (three typed edits suffice).
- A shared `LiveSession` for both sources.
- A unique-id session title (`parseLaunchTitle` rejects extra tokens; attribution breaks).
- iTerm close/attach helpers (`--bg` + `claude stop|rm` replace them).
- Migration / after-merge checks (project gates, not plugin code).

## Decisions for create to lock
- **Name clash:** spec folder `oversee-crew` = sub-command `oversee-crew`, so bare
  `/spec oversee-crew` dispatches the mode, not the spec (`T/context/request.ts:21-22`);
  `/spec execute|resume oversee-crew` still work. Keep, or rename the spec folder.
- Ship mode values and their wording (`auto` / `review`?) given the "review" collision.
- Overseer pause word (stand down / resume?).
- Workers as `--bg` sessions by default vs iTerm tabs (attach for Anton to jump in).
- Where ship mode lives: spec `CLAUDE.md` (per spec, landable on main) — per-PR-group
  override or not.
- Push-on-every-commit rule once a PR is ready (skip while CI runs on a ready PR?).
- Fold self-driving-loop phase 1's board deliverables in, or `needs: [self-driving-loop#1]`.
