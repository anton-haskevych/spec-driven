---
needs: []
pr: B
shape: harness-first
---

# Phase 2 — Tick and deployed

**Goal:** `spec.ts tick` and `spec.ts deployed` replace every hand edit of checkboxes and the deployed marker, and the shared test tree builder exists for all later writer phases.

**Outcome:** Progress bookkeeping becomes one reliable step; boxes can't drift from their phase entries. No cost; low risk (writes are line patches, round-trip tested).

**Files to touch:**
- `skills/spec/tools/tests/tree.ts` (new — consolidates the four `write()` helpers and `graph.test.ts:14-20`)
- `skills/spec/tools/core/progress.ts` (export `DEPLOYED_SUFFIX`, `PHASE_POINTER`)
- `skills/spec/tools/doctor/task-phases.ts` (export `TICKED_ITEM`, `EVIDENCE`)
- `skills/spec/tools/core/schedule.ts` (`isoTimestamp` beside `isoDay`)
- `skills/spec/tools/phases/tick.ts`, `phases/deployed.ts`, `phases/locate.ts` (new)
- `skills/spec/tools/commands/tick.ts`, `commands/deployed.ts` (new); `spec.ts` registration
- `skills/spec/execute.md` (:97, :147-149), `update.md` (:36-49), `SKILL.md` (:248, *Tools*)

## Implementation guidance

`parsePhaseLines` is AST-based and has no line numbers, so writers need `phases/locate.ts`: find a phase's progress line and a phase entry's `- [ ]` line by text prefix, returning a line index or an ambiguity error. Readers and writers share the exported regexes so what `tick` writes is what `loadSpecState` reads back — every writer test ends with a `loadSpecState` round-trip.

`tick` rules: exactly one open item matches the prefix (else `invalid` listing candidates); task phases (`code: false`) require `--evidence` and append it in the `EVIDENCE` form; when the last open item is ticked, flip the progress.md box too. `deployed` refuses an unticked phase and is idempotent. `isoTimestamp` must match `spec-bump.sh --now` byte-for-byte in format — a test spawns the script and compares shapes.

Migrate existing tests onto `tree.ts` only where touched; don't rewrite unrelated suites.

## Deliverables

- [ ] `tests/tree.ts` builder; one existing suite migrated as proof
- [ ] Shared patterns exported; `isoTimestamp` + format test against `spec-bump.sh --now`
- [ ] `phases/locate.ts` line locator with ambiguity handling
- [ ] `tick` (code phase) with top-box flip on last item; round-trip test
- [ ] `tick --evidence` for task phases; refuses without evidence
- [ ] `deployed` marker writer; refuses unticked; idempotent
- [ ] Mode files call `tick`/`deployed` (with no-Bun fallback lines); SKILL.md *Tools* + README

## Phase-local notes

`hook.test.ts` mutates a shared tree in order — don't copy that pattern into `tree.ts`; give each test its own tree.
