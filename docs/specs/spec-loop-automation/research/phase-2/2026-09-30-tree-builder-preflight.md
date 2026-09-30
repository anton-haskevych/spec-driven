# Phase 2 preflight — chunk 1 (tree builder → phase tick)

Inputs: the phase entry, `2026-09-30-tree-builder-recon.md`, and `principles.md`. Paths are relative to `skills/spec/tools/`.

## Findings that change the plan

1. **Planned-text validation has no seam.** The plan says to validate "with `checkPhases`/`taskPhaseIssues`", but `taskPhaseIssues(state)` (`doctor/task-phases.ts:10`) needs a `SpecState`, and the only way to build one is `loadSpecState` (`core/spec-state.ts:32-39`), which reads disk. So we extract `specStateFrom(spec, read)` first, as its own green commit. `loadSpecState` becomes the disk-reader wrapper, and writers pass a reader that lays the plan's edits over disk.
2. **Validation must be diff-based.** `taskPhaseIssues` warns about *every* unevidenced tick in a task phase (`doctor/task-phases.ts:32`), and `checkPhases` warns on any drift (`doctor/phases.ts:18-23`). If "any issue → invalid", one pre-existing warning blocks every tick. The rule is: invalid only for issues present in the planned state and absent from the current state.
3. **The command table stays in `spec.ts`.** The recon placed it in `commands/table.ts`, but `spec.ts:46` already guards `main` with `import.meta.main`, so exporting `COMMANDS` from `spec.ts` is enough for the wiring test to import. A separate file would be one extra hop for no gain.
4. **Flags: `parseArgs` only where a command takes flags.** `list` hand-rolls `--json` and `all` (`commands/list.ts:10-22`). It isn't touched this chunk, so it stays as it is (no drive-by rewrite). `commands/phase.ts` is the first `parseArgs` user.

## Clean Code against the chunk

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions, one level | Bites | `phases/tick.ts` splits into locate → rewrite line → completion flip → validate; each is under 50 lines |
| No flag arguments | Bites | Tick's code/task behaviour comes from the phase's `code` field (`PhaseState.code`), not a boolean parameter |
| Errors are values | Bites | `EditPlan` `invalid` carries the reason, and `commands/phase.ts` renders it. No throws cross into `spec.ts:49` |
| Names | Bites | `formatTickedItem`, `locateOpenItem`, `locatePhaseLine`, `specStateFrom` |
| Comments | Inert | — |

## Clean Architecture / SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule (core ← doctor) | Bites | Patterns go to `core/checkbox.ts`, and `doctor/task-phases.ts` imports them. Writers import doctor *checkers* only (technical.md allows it); patterns never come from doctor |
| Humble object at I/O | Bites | `core/apply-edits.ts` is the only writer that touches disk. `tick` is pure over `(state text, args)` |
| OCP (next variant) | Bites | `add`/`split` join `commands/phase.ts` in phase 3, so its action dispatch is a small table, not an if-chain |
| DIP | Bites | `specStateFrom` takes a `read` function (the same shape as `ReadPhaseEntry`, `doctor/phases.ts:4`) |
| ISP / LSP | Inert | — |

## DDD

Skipped. This is tooling with no domain aggregates. The ubiquitous-language check: "item" = a checkbox line in a phase entry, and "phase line" = a checkbox line in progress.md. Keep those two words.

## Guard blindness

The "every writer test ends with `loadSpecState`" round-trip can observe a broken tick (the box count and `done` flag change). The wiring test for USAGE observes a command with no usage text only if it iterates `Object.entries(COMMANDS)`, not a hard-coded list.

## Seam and testability (deltas from recon)

- `#N` counts open items across all depths in file order, outside code fences. That matches `countCheckboxes`, which counts every depth (`core/progress.ts:30-33`).
- Prefix match: render one candidate line through `outlineMarkdown` (`core/markdown.ts:37`) to get the stripped text. That means no second markdown stripper.

## Amendments

1. The first unit is the `specStateFrom` extraction (a refactor commit, green).
2. The validation helper `newIssues(before, after)` compares `severity+file+problem`. A writer returns `invalid` when it's non-empty.
3. `COMMANDS` is exported from `spec.ts`. `USAGE = Object.entries(COMMANDS).map(usage).join(" | ")`.
4. `list`'s flag parsing is left as is.

## Decisions for you

None.
