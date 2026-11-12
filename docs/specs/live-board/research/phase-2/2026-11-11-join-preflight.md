# Phase 2 preflight — a spec joins the board (2026-11-11)

Inputs: `phases/phase-2-join.md`, `research/phase-2/2026-11-11-join-recon.md`, `principles.md`.
Paths relative to `skills/spec/tools/`.

## Findings that change the plan

1. **The deployed date is thrown away.** `core/progress.ts:27-35` `parsePhaseLines` keeps `deployed: boolean`
   only; `PhaseDoc.deployed` is a date. Join has no date to write.
2. **Rendered task text loses markdown.** `core/markdown.ts` `listItem` children are rendered (codespans come
   back without backticks), so `TaskItem.text` can't be stored as a task's text without rewriting every
   deliverable. Matching wants plain text; storage wants the raw line.
3. **Cross-document problems can't live in `validate(path, doc)`.** `record/plan-writes.ts` `Validate` sees
   one document; "unknown phase in `phases`" and "a `needs` that doesn't resolve" need the spec and its
   phases together.
4. **The implied-edge rule already exists.** `ready/ready-set.ts:44-48` `phaseNeeds(state, phase, index)`
   returns exactly what join must write; a second copy in `plan/join.ts` would drift.
5. **`WorkspaceView` has no head commit** (`board/inputs.ts:19-25`); the evidence fallback needs it.
   `WorkspaceScan.workspace.head` (`workspaces/list.ts:5-13`) has it.

## Clean Code against phase 2

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions, one thing | Bites | `planJoin` = merge phase lists · match tasks · write edges · build docs: four files' worth; split `plan/join.ts` from `plan/join-tasks.ts` and `plan/entry-tasks.ts` |
| Names | Bites | `plan*` pure, `read*` with problems, `land*` to a ref (technical.md → File tree) |
| Errors as values | Bites | readers return `{ value?, problems }`; command maps `StoreWrite` kinds to lines |
| Comments | Inert | |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule | Bites | `record/` imports no reader: `plan/kinds.ts` hands `validateRecordDoc` to `writeRecord`; `core/` never imports `plan/` |
| Humble object | Bites | `commands/join.ts` gathers base + trees + port; `planJoin` stays pure |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | settings reading vs field helpers: helpers to `core/read-fields.ts` |
| OCP | Bites | `plan/kinds.ts` registry: phase 6–9 add kinds as rows, not branches in the store |
| DIP | Bites | command takes `JoinDeps { runner, asyncRunner, now }`, like `RecordDeps` (`commands/record.ts:15`) |
| LSP, ISP | Inert | |

## DDD

| Rule | Verdict | Consequence |
|---|---|---|
| Invariant owner | Bites | per-document shape → readers; plan-wide (ids, needs) → `specPlanProblems` |
| Ubiquitous language | Bites | "task", "phase", "disagreement", "on the board" |

## Guards

None claimed. The golden ready-set test is the guard for edges; it compares ready/waiting ids, not reason text
(linear reasons word differently from declared ones).

## Seam and testability (deltas from recon)

- `ready/ready-set.ts` exports `phaseNeeds` already: no extraction needed.
- `commands/join.ts` will run near 150 lines; the banner land goes in `plan/banner.ts` (pure plan + land).

## Amendments

1. `parsePhaseLines` captures `deployedOn?: string` from the ` · deployed <day>` suffix; `PhaseState` carries it.
2. `plan/entry-tasks.ts` reads raw checkbox lines (fences skipped, Deliverables-section rule of
   `core/phase-entry.ts:21-23`), splits the ` — ` evidence off ticked items when `hasEvidence` holds, marks
   `Gate:` items; matching compares whitespace-collapsed, lower-cased plain text.
3. Readers check one document; `plan/docs/spec-plan.ts` `specPlanProblems(spec, phases)` checks phases ↔ docs,
   local `needs`, duplicate task ids across phases; `planJoin` refuses on any.
4. `planJoin` builds a merged `SpecState` and calls `phaseNeeds` for each phase.
5. The command builds tree copies from `scanWorkspaces` + `loadSpecState`, with `workspace.head`.

## Defaults applied

- `describeSettings` adds `board record on` only when on (off is the default and stays silent).
- The banner goes right after the H1 of `progress.md` (top when there is none).
- A tree is named by its folder (`basename`), as the board does (`board/cells.ts:45`).
- Already joined = the plan sees `spec.json` (unchanged) or the create conflicts; both print `already on the board`.
- A tree task that matches no base task is listed, not added; `join --from-tree` (phase 3) is where trees add.
- A local `needs` ref is one starting with a digit and holding no `#`; others are cross-spec refs left as is.

## Forks for you

None.
