---
needs: []
pr: B
---

# Phase 4 — Tools from any folder, start-up context that fits

**Goal:** `spec.ts` and `spec-bump.sh` find the spec from any folder under the project, and the execute pack stays under the ~30K tool-output limit.

**Outcome:** No more "spec not found" after a `cd`, and sessions stop reading their start-up context back from a file · small · risk: a working folder with its own `docs/specs` (a subproject) now resolves there — which is what that folder means.

**Files to touch:**
- `skills/spec/tools/core/spec-folders.ts`, `tools/spec.ts`
- `skills/spec/scripts/spec-bump.sh`
- `skills/spec/tools/context/packs.ts`
- `skills/spec/tools/tests/spec-folders.test.ts`, `context.test.ts`, `schedule.test.ts`

## Implementation guidance

technical.md → Code. `findProjectDir` is pure over an injected `exists`, so its tests need no file system; `spec.ts` wires the real one. Walk up to the nearest folder that holds `docs/specs`, never to the git toplevel (craft → Don't extract). `spec-bump.sh` stays bash (the no-Bun path) with the same walk.

Pack: `PROJECT_LESSONS_LIMIT` plus `withinBudget` and a hidden-rows note, the `ledgerBlock` pattern. Measure one CRM execute pack before and after and put both numbers in the PR body.

Release for PR B goes here.

## Deliverables

- [ ] `findProjectDir` + tests (root, spec folder, `landing/docs/specs/x`, outside any spec tree); `spec.ts` uses it
- [ ] `spec-bump.sh` walks up the same way; test from a spec folder
- [ ] Project-lessons block capped with a note; test; CRM pack measured before/after
- [ ] Release: version bump, ROADMAP row

## Phase-local notes

Lessons: `gotcha-bun-glob-scan-throws-on-missing-cwd` (the walk must not glob a folder that doesn't exist), `gotcha-bun-test-runs-in-utc-but-spawned-children-do-not` (the `spec-bump.sh` test passes `TZ`).
