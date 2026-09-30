# Phase 2 recon — tree builder → phase tick (chunk 1)

Inline recon (the tool tree is ~3.2K lines; the seam was readable directly). Paths are relative to `skills/spec/tools/`.

## Seam

- `spec.ts:14-38`: a `switch` of 8 commands plus a hand-written `USAGE` string. Every command returns a string, and `main` never exits non-zero (`:46-51`). The `COMMANDS` table goes here. `context` needs `parseContextRequest` plus a `findSpecs` predicate, and `list` needs `isoDay(new Date())`, so each `run` takes `(projectDir, args)` and closes over the rest.
- `core/progress.ts:10,17`: `DEPLOYED_SUFFIX` and `PHASE_POINTER` are private. Export both. `parsePhaseLines` goes through `outlineMarkdown` (Bun.markdown AST) and has **no line numbers**, so the locator has to scan raw lines itself.
- `core/markdown.ts:36-38`: task text is the *rendered* children (backticks and emphasis already stripped). That is exactly the "stripped text" the locator should match a prefix against. Reuse it by rendering one line through `outlineMarkdown`, so we don't hand-roll a markdown stripper.
- `doctor/task-phases.ts:6-7`: `TICKED_ITEM` and `EVIDENCE` move to `core/checkbox.ts`. `SELF_CHECK` stays in doctor.
- `core/spec-state.ts:32-55`: `loadSpecState` reads disk through `readTextIfExists(join(spec.dir, …))`. Writers must validate *planned* text, so split it into `specStateFrom(spec, read)`, with `loadSpecState = specStateFrom(spec, diskReader(spec.dir))`. The planned-state reader overlays `EditPlan.edits` on disk.
- `doctor/phases.ts:9`: `checkPhases(progressFile, lines, readEntry)` already takes a reader. `doctor/task-phases.ts:10` `taskPhaseIssues(state, onlyPointer)` takes a state, and gets one from `specStateFrom` with the overlay reader.
- `core/schedule.ts:41`: `isoDay` is local-time. `isoTimestamp` goes beside it. The `spec-bump.sh --now` shape is `2026-09-30T15:53:19-07:00` (`date +%Y-%m-%dT%H:%M:%S%z`, colon inserted).

## Reuse

- `countCheckboxes` (`core/progress.ts:30`) is the doctor's definition of "phase complete". Tick uses it on the planned entry text.
- `findSpecs` (`core/spec-folders.ts:29`) resolves `<spec>`. It returns 0 or several matches, and tick reports either as `invalid`.
- `parsePhaseTitle` (`core/phase-title.ts`) plus `samePhase` identify a phase id against the progress lines, the same way `ready` does.
- `node:util` `parseArgs` works under Bun (strict, `allowPositionals`).

## Testing-issue estimate

- **Duplicated temp-tree helpers**: `hook.test.ts:11-16` (`write`), `task-phases.test.ts:12-15`, `graph.test.ts:14-20` (`spec`), plus mkdtemp/rmSync boilerplate in 9 suites. `tree.ts` replaces them. Migrate `task-phases.test.ts`'s first block as the proof (small, self-contained). `hook.test.ts` mutates a shared tree in order, so leave it alone.
- **No fixture for trailing-note progress lines**: add one in the deployed tests.
- **Size caps**: `spec.ts` is 52 lines and stays small once the command table moves into `commands/table.ts`. No file in the seam is near 250.
- **I/O tangled with logic**: `loadSpecState` (see Seam). Extract the reader first, as its own green commit.
- **`isoTimestamp` vs script**: the test spawns `bash ../scripts/spec-bump.sh --now` and compares the regex shape, not the value (the seconds can tick over).
- **zsh backticks**: the `#N` locator form exists so a shell-quoted prefix never needs backticks.
