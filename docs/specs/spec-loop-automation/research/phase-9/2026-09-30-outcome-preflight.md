# Phase 9 preflight — plain-words outcome

Inputs: `phases/phase-9-plain-words-outcome.md`, `research/phase-9/2026-09-30-outcome-recon.md`, `principles.md`. Paths relative to `skills/spec/`.

## Findings that change the plan

1. **"create.md templates" (plural) is false — there is one.** `create.md:286-300` holds a single phase template (`**Goal:**` at `:294`), used for flat files and folder `plan.md` alike. One edit.
2. **Two copies of the Outcome placeholder.** `tools/phases/template.ts:42` (phase 3) already writes `**Outcome:** <plain words: what changes for the user · cost · risk>`; create.md will hold the prose copy. principles.md §8 (single source of truth) — the prose can't import TS, so pin them: `tests/skill-wiring.test.ts` asserts create.md contains `template.ts`'s Outcome line.
3. **Only one consumer of `goal`.** `context/status-table.ts:37` is the sole reader (`rg summary.goal`), so the Delivers swap touches one line; no pack or list code needs changing.
4. **execute §10 has no PR-body step to amend.** `execute.md:139` (step 4) says where and draft-or-ready, nothing about the body. Add one sentence to step 4, not a new step.

## Canon against phase 9

| Rule | Verdict | Concrete consequence |
|---|---|---|
| A — names | Bites | field `outcome` beside `goal` in `PhaseEntrySummary` (`core/phase-entry.ts:4`) |
| A — small functions | Bites | `OUTCOME` regex mirrors `GOAL` (`:11`); first-sentence cut reuses `SENTENCE_END` (`:14`) via a helper shared with `workSummary` (second use → extract) |
| A — tests | Bites | `tests/context.test.ts:57` full-object `toEqual` gains `outcome` |
| B / C / D | Inert | pure parsing + rendering; no boundaries, actors or domain model |

## Guard blindness

- `status.md:66` forbids new columns; the renderer has no test pinning the header text beyond `context.test.ts` snapshots — fine, no column is added.

## Seam and testability (deltas)

None beyond recon.

## Amendments

1. Phase entry: "create.md template" (singular).
2. Wiring test pins create.md's Outcome line to `template.ts`'s.
3. Delivers = first sentence of Outcome, else Goal, else name; status.md `:27` documents the order.
4. execute §10 step 4 gains: the PR body opens with the Outcome line of each phase it ships.
5. Phase 9 `pr: C` (built on `feat/project-settings`; avoids the phase 5 `context` rebase).

## Decisions for you

None.
