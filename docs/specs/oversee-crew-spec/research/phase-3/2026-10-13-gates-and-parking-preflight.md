# Phase 3 preflight — gates and parking (2026-10-13)

Inputs: phase entry, `2026-10-13-gates-and-parking-recon.md`, `skills/spec/principles.md`.

## Findings that change the plan

1. **Handoff would erase the park entry.** `handoff.md:58` overwrites `in-flight/phase-<id>.md` on every
   handoff, and a crew worker parks *then* hands off (`execute.md:203`). The `## Needs you` section must
   survive the overwrite. `handoff.md` is not in *Files to touch*; it joins this phase.
2. **The overseer has no tree to unpark in.** `oversee-crew.md` §5 relaunches with
   `crew launch execute … --note "Anton answered …"`, and the overseer writes no code. `phase unpark`
   writes the phase's in-flight file, which lives on the worker's branch. So the relaunched worker
   records the answer (`phase unpark`) as its first step, from its brief; an interactive session does
   the same when the user answers in the conversation.
3. **"Other machines see the parked phase" holds only once the branch's docs are visible.** The board
   overlays local worktrees (`T/workspaces/views.ts:10-24`) and base; it never reads remote branches.
   With `docs: branch` another machine sees the park after the branch lands (or `publish-docs` in a
   `docs: main` project). The committed, pushed entry is still the one home; no extra store.
4. **The run file's `## Questions` stays** (`T/crew/run-state.ts:43`, `T/crew/pick.ts:20`): it records
   when a question was asked and answered, which the park entry doesn't. The park entry is the
   question's text; `## Questions` keeps only bookkeeping. No change to the crew tools.

## Canon against phase 3

| Rule | Verdict | Consequence |
|---|---|---|
| Pure functions (house §3) | Bites | Park parse/format in `T/core/park.ts`, pure over text; `phases/park.ts` only plans edits (as `phases/deployed.ts`) |
| Extract on second use (house §9) | Bites | `sectionRange`/`withSection` (`T/crew/run-state.ts:100-116`) move to `T/core/markdown-sections.ts` with a test, used by run-state and park |
| Size caps (house §5) | Bites | `board/lanes.ts` is 187 lines: the parked set lives in `board/parked.ts`, lanes only filters |
| Single source of truth (house §8) | Bites | Parked = an unanswered park entry in the phase's in-flight note; board, pack and crew all read it through `openPark` |
| Errors are values (house §15) | Bites | `planPark` returns `EditPlan` invalid reasons, never throws |
| SRP | Inert | — |
| OCP: gate kinds | Bites | `GATE_KINDS` constant, validated in one place; phase 5's self-approve list reads it |
| DIP | Inert | — |
| Clean Architecture boundaries | Inert | CLI tool, no layers beyond core/board/commands |
| DDD | Skipped | Tooling, no domain model |

## Guard blindness

- `attentionCells` (`T/board/render.ts:122`) `never` default: a `question` kind fails to compile until
  rendered. Works as intended.
- The spec-file hook only blocks on errors (`spec-file-check.ts:90`): a gate with no `Gate:` item is a
  warning (doctor shows it), a bad gate value an error.

## Amendments

1. `handoff.md` keeps the `## Needs you` section when it rewrites the phase's in-flight file, and a
   phase with an unanswered park is never at a clean boundary.
2. Execute's crew/answer flow: a launch brief carrying the user's answer → `phase unpark` first, commit.
3. Execute pack prints `Parked: …` / `Answered: …` under `Picked:` when the phase's note has an entry.
4. Extract markdown section helpers before the park writer (own green commit).

## Defaults applied

- Park entry format under `## Needs you`: `- Parked <timestamp>: <question> · recommend: <answer>`,
  answer as a child line `  - Answered <timestamp>: <answer>`. Parked = last entry unanswered.
- `Gate:` item = an open item whose text starts `Gate:`, optionally after a numbered id (`3.0 Gate: …`).
- Gate evidence uses `hasEvidence` (a date, link or path): "Anton, 2026-10-13" passes.
- Doctor: invalid `gate:` value → error; `gate:` with no `Gate:` item → warning.
- Board JSON stays version 2: a new kind adds no field meaning (`decision-review-state-comes-from-the-pr`).
- Board reads the park from the worktree copy of the spec first, base second.

## Forks for you

None.
