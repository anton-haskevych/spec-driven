# Phase 4 preflight — person section (2026-10-17)

Inputs: phase entry, `2026-10-17-person-section-recon.md`, `principles.md`. Seam fully read in recon; short pass.

## Findings that change the plan

1. The phase entry asks for lane state per owned spec; `board/focus.ts:95-99` `focusNow` already derives it from the built lanes, and `render-focus.ts:37-55` `nowText` renders it. Export both instead of a second derivation. Consequence: the owns cell reads `blocked: needs 3`, as FOCUS does, not design.md's `blocked (needs 3)`.
2. `focusNow` returns `none` for a finished spec with no open PR (`focus.ts:122-125`), so `gift-cards done` (design.md copy) needs its own case: an owned spec that `isFinished` and has `now.kind === "none"` shows its status (`done`, `good-enough`, `abandoned`).
3. `test("text names the person; me with nothing on the board is none")` (`tests/board-command.test.ts:103-106`) pins `board --who me` output; the section now opens the board, so the pin changes — the phase entry names `:105`, correct.

## Pass A — Clean Code

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions, one level | Bites | `personWork` composes `ownedSpecs`, `liveClaims`, `authoredPrs`, `mySessions`; each < 20 lines |
| Few arguments | Bites | `personWork(inputs, board, who)` = 3; render `personSection(work, now)` = 2 |
| No null returns | Bites | Empty arrays, `—` in render; `sessions` absent unless mine |
| Names | Inert | `PersonWork`, `personSection` follow `FocusWork`/`focusSection` |

## Pass B — Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Humble object | Bites | All I/O stays in `loadBoardInputs`; `commands/board.ts` only wires; `personWork` pure |
| Dependency direction | Bites | `person-work.ts` → `focus.ts`, `attribution.ts`, `people.ts`, `core/people.ts`; no import back (no cycle) |

## Pass C — SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | Data (`person-work.ts`) and copy (`render-person.ts`) apart, like `focus.ts`/`render-focus.ts` |
| OCP/LSP/ISP/DIP | Inert | — |

## Pass D — DDD

Skipped: tooling view, no domain model.

## Guard blindness

Inert: no guard cited.

## Seam and testability (deltas)

- `Board.me` comes from `runnerName` inside `loadBoard` (`board/load.ts:42`); the `--who` path builds the board itself, so lift that line into an exported `boardMe(projectDir, runner)` used by both, or the two paths could disagree on "me".

## Amendments

1. Export `focusNow`, `focusSession` (`board/focus.ts`) and `nowText` (`board/render-focus.ts`); reuse them.
2. Owned entry `now` = `FocusNow | { kind: "finished"; status }`.
3. `boardMe` helper in `board/load.ts`, used by `loadBoard` and `commands/board.ts`.

## Defaults applied

- Owns cell copy is FOCUS's (`blocked: needs 3`), not design.md's `blocked (needs 3)`.
- Section rows indented and aligned like every other lane (`lane()` + `alignColumns`).
- Section sits after the header, before FOCUS; only with no lane (`board --who X`); `--json` carries `people` whatever the lane.
- Owns shows 3 specs then `+N` (design.md copy); JSON carries all.
- PR label from its branch: `feat/<spec>-pr-<g>` → `<spec> pr-<g>`, with the check verdict.
- Title is the person's name in caps; for `me`, the runner name (`ME` when git has none).

## Forks for you

None.
