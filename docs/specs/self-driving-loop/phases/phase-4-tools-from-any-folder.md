---
needs: []
pr: B
---

# Phase 4 — Tools from any folder, start-up context that fits

**Goal:** `spec.ts`, both hooks and `spec-bump.sh` resolve the project from any folder under it, and the execute pack stays under the ~30K tool-output limit.

**Outcome:** No more "spec not found" after a `cd`, lesson reminders and spec-file checks keep working there, and sessions stop reading their start-up context back from a file · small · risk: a folder inside a subproject (`landing/src`) now resolves to the outermost folder holding `docs/specs`, so root settings apply — which is what CRM expects.

**Files to touch:**
- `skills/spec/tools/core/spec-folders.ts`, `tools/spec.ts`
- `skills/spec/tools/hooks/lesson-recall.ts`, `hooks/spec-file-check.ts`
- `skills/spec/scripts/spec-bump.sh`
- `skills/spec/tools/context/packs.ts`
- `skills/spec/tools/tests/spec-folders.test.ts`, `spec-bump.test.ts` (new), hook tests, `context.test.ts`

## Implementation guidance

technical.md → Phase 4. `findProjectDir(start, exists = existsSync)` returns the **outermost** ancestor holding `docs/specs`, checking each folder before stopping at `.git` (a directory or a worktree's file) — ledger `decision-project-dir-is-outermost-docs-specs`. Nearest would re-root CRM `landing/…` and drop the root `_playbook` settings. Tests use `createTree` like their siblings. `spec-bump.sh` stays bash with the same walk, placed in the name branch only.

Hooks: `payload.cwd` follows the session's `cd`; wrap it in `findProjectDir`.

Pack: lessons as one-line pointers in a 3K budget with a hidden-rows note (the `ledgerBlock` pattern), playbooks clipped at 3K, and a fixture test on the whole pack. Measure CRM's max and median packs before and after; both numbers go in the PR body.

## Deliverables

- [ ] `findProjectDir` + tests (root, spec folder, `landing/src` under two roots, worktree `.git` file, outside any tree); `spec.ts` uses it; board/claim from a subfolder works
- [ ] Both hooks use it; one subfolder test each
- [ ] `spec-bump.sh` walks the same way in its name branch; `tests/spec-bump.test.ts`
- [ ] Lessons as pointers within budget, playbooks clipped, whole-pack fixture test < 30K; CRM max and median measured

## Phase-local notes

Lessons: `gotcha-bun-glob-scan-throws-on-missing-cwd` (the walk must not glob a folder that doesn't exist), `gotcha-bun-test-runs-in-utc-but-spawned-children-do-not` (the `spec-bump.sh` test passes `TZ`).
