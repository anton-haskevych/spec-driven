---
needs: []
pr: B
shape: harness-first
---

# Phase 2 — Tick and deployed

**Goal:** `spec.ts phase tick` and `spec.ts phase deployed` replace every hand edit of checkboxes and the deployed marker; the writer plumbing (edit plan, shared patterns, command table, flag parsing) and the test tree builder exist for all later writer phases.

**Outcome:** Progress bookkeeping becomes one reliable step; boxes can't drift from their phase entries. No cost; low risk (writes are line patches, validated before they land, round-trip tested).

**Files to touch:**
- `skills/spec/tools/tests/tree.ts` (new — consolidates the four `write()` helpers and `graph.test.ts:14-20`)
- `skills/spec/tools/core/checkbox.ts` (new — open/ticked item + evidence patterns moved from `doctor/task-phases.ts:6-7`, `formatTickedItem`); `doctor/task-phases.ts` imports it
- `skills/spec/tools/core/progress.ts` (export the pointer + deployed-suffix patterns)
- `skills/spec/tools/core/apply-edits.ts` (new — `EditPlan` type + the one applier)
- `skills/spec/tools/core/schedule.ts` (`isoTimestamp` beside `isoDay`)
- `skills/spec/tools/phases/tick.ts`, `phases/deployed.ts`, `phases/locate.ts` (new)
- `skills/spec/tools/commands/phase.ts` (new — `phase tick|deployed`; `add|split` join in phase 3)
- `skills/spec/tools/spec.ts` (switch → `COMMANDS` table with derived `USAGE`; `parseArgs`)
- `skills/spec/execute.md` (:97, :147-149), `update.md` (:36-49), `SKILL.md` (:248, *Tools*)

## Implementation guidance

**Plumbing first.** Convert `spec.ts` to a `COMMANDS: Record<name, {usage, run}>` table with `USAGE` derived and a wiring test that every entry has usage text; flags via `parseArgs` from `node:util`. Add `EditPlan` + `applyEdits` (renames, then writes) — writers never touch disk themselves.

**Locator.** `parsePhaseLines` is AST-based and has no line numbers, so `phases/locate.ts` finds a phase's progress line and an entry's `- [ ]` line: skip fenced code, match the prefix against markdown-stripped text case-insensitively, or take `#N` (Nth open item — avoids backticks in a shell-quoted prefix, which zsh runs as command substitution). Ambiguity → `invalid` listing candidates. Readers and writers share the `core/` patterns, and every writer test ends with a `loadSpecState` round-trip.

**`tick`.** Task phases (`code: false`) require `--evidence`, which must pass the evidence pattern; the item is rewritten via `formatTickedItem`. "Phase complete" = `countCheckboxes(entry).unchecked === 0` (the doctor's definition, `doctor/phases.ts:17`) — not Deliverables only. On completion flip the progress.md box in the same plan and print `Phase N complete — run update.md → Close the phase`. Validate the planned text with `checkPhases`/`taskPhaseIssues` before returning `ok`.

**`deployed`.** Insert ` · deployed <date>` **immediately after the pointer**, not at line end: `core/progress.ts:10` only sees a suffix right after the pointer, and CRM lines carry trailing notes (`backend-ecs-blue-green/progress.md:30` — `… .md (closed 2026-09-08)`). Refuse unticked; idempotent. Fixture includes a trailing-note line.

`isoTimestamp` must match `spec-bump.sh --now` byte-for-byte in format — a test spawns the script and compares shapes.

Migrate existing tests onto `tree.ts` only where touched; don't rewrite unrelated suites.

## Deliverables

- [x] `tests/tree.ts` builder; one existing suite migrated as proof
- [ ] `spec.ts` command table + derived USAGE + wiring test; `parseArgs`
- [x] `core/checkbox.ts` patterns moved out of `doctor/`; `EditPlan` + `applyEdits`; `isoTimestamp` + format test
- [ ] `phases/locate.ts` locator (code fences, stripped-text prefix, `#N`, ambiguity)
- [ ] `phase tick` (code phase) with completion flip + close-phase message; round-trip test
- [ ] `phase tick --evidence` for task phases; refuses without valid evidence
- [ ] `phase deployed` inserts after the pointer; refuses unticked; idempotent; trailing-note fixture
- [ ] Mode files call `phase tick`/`phase deployed` (with no-Bun fallback lines); SKILL.md *Tools* (grouped) + README

## Phase-local notes

`hook.test.ts` mutates a shared tree in order — don't copy that pattern into `tree.ts`; give each test its own tree.
