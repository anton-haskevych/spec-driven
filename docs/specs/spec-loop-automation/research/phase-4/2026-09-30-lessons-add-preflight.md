# Phase 4 preflight — lessons add

Inputs: `phases/phase-4-lessons-add.md`, `research/phase-4/2026-09-30-lessons-add-recon.md`, `principles.md`, `ledger/principle-writers-plan-validate-then-apply.md`.

## Findings that change the plan

1. **`lessons seen` writes around the single applier.** `commands/lessons.ts:53` calls `writeFileSync` directly; the house rule (`principle-writers-plan-validate-then-apply.md`) says `core/apply-edits.ts` is the only disk writer. `seen-in.ts` is already in this phase's files, so route `seen` through an `EditPlan` + `applyEdits` while `addSeenIn` becomes a `setFrontmatterLine` caller.
2. **`addSeenIn` can rewrite the body.** `seen-in.ts:5,15`: `SEEN_IN_BLOCK` is a multiline regex over the whole text, so when the header has no `seen-in:` but a body line starts with it, the body line is rewritten and the header stays without one. `setFrontmatterLine` must patch the header only; add a test for that case.
3. **The planned INDEX validation can't see the pointer row.** `doctor/ledger.ts:5` `INDEX_ROW_FILE` excludes `/`, so `checkLedgerIndex` on the spec INDEX ignores `docs/specs/_ledger/…` rows: a malformed or duplicate pointer passes. The phase entry keeps that regex until phase 5, so `planLessonAdd` must guarantee the pointer itself: target = the entry it just read (exists by construction), skip when `parseIndexRows` already lists that file. Not a fix to make here.
4. **SKILL.md line reference is stale.** The entry says *Write path* is at `:366-375`; it is at `SKILL.md:372-379` now. Edit by heading, not line.
5. **`resolveSpec` has a second caller.** `commands/phase.ts:129-135` is private; `lessons add` needs it → move to `core/spec-folders.ts` with a unit test (principles.md §9).

## Clean Code against the plan

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Intention-revealing names | Bites | `parseIndexRows`, `insertRow`, `formatSpecRow` / `formatProjectRow` / `formatPointerRow`; `planLessonAdd` mirrors `planAdd`/`planTick` |
| Few arguments, no flags | Bites | `insertRow(text, row, section?)` — `undefined` section means "no sections, append"; not a boolean |
| No side effects | Bites | `planLessonAdd` reads, never writes; `commands/lessons.ts` applies |
| Errors as values | Bites | title over 80 chars without `--summary` → `invalid` with the reason, before any write |
| Tests F.I.R.S.T | Bites | `createTree()` per test, `afterEach(tree.cleanup)`; inject `now` for `created:` |

## Clean Architecture / SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule (`core/` never imports `doctor/`) | Bites | `ledger-index.ts` lives in `core/`; validation in `lessons/add.ts` may import `doctor/` checkers, as `phases/validate.ts:6-10` does |
| SRP | Bites | row text (`core/ledger-index.ts`) vs. tag scoping (`context/ledger-scope.ts`) vs. bookkeeping plan (`lessons/add.ts`) |
| OCP | Bites | free-form kinds get `## <Kind>s` without a kind table edit; existing sections match by singular form (`Domain`, `Gotchas`) |
| LSP, ISP, DIP | Inert | — |

## DDD

Skipped — tooling text manipulation, no domain model.

## Seam and testability (deltas from recon)

- None. Recon's estimate holds; `packs.ts:82` keeps calling `parseLedgerIndex` with an unchanged return shape.

## Amendments

1. `lessons seen` builds an `EditPlan` and goes through `applyEdits`.
2. `setFrontmatterLine(text, key, value)` touches only the header; test a body line that starts with the key.
3. `planLessonAdd` skips each INDEX row whose file is already listed; when nothing changes → `unchanged`.
4. `resolveSpec` moves to `core/spec-folders.ts` with a test; `commands/phase.ts` imports it.

## Decisions for you

None.
