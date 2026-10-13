# Phase 4 preflight

Inputs: phase entry, `2026-10-12-phase-4-recon.md`, `principles.md`. Paths under `skills/spec/`.

## Findings that change the plan

1. **The 3K playbook clip can't live in `renderPlaybooks`.** `playbook/render.ts:6` is shared with `spec.ts playbooks`, which prep/create/review read in full. Clip the rendered block in `context/packs.ts` `playbooksBlock` (:87) instead; that covers both resume and execute packs.
2. **The real cost is lessons, and the CRM target numbers in technical.md are stale.** technical.md cites max 46.9K / median 39.7K (session transcripts). Today's in-process measure over all 92 open CRM specs: max 69,043, median 20,963, 20 over 30K; lessons are 44K of the max. The plan holds (pointers in 3K); the PR body reports the fresh numbers.
3. **`lesson-recall` silently drops every lesson after a `cd`.** `hooks/lesson-recall.ts:24-25`: `toProjectPath` against the subfolder makes a root file `../x`, which `startsWith("..")` discards. The subfolder test should edit a file *outside* the cwd subfolder, so it fails today for that reason.

## Clean Code / SOLID / Clean Architecture / DDD against phase 4

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Small functions, one thing | Bites | `findProjectDir` is a pure walk with an injected `exists`; no glob (`gotcha-bun-glob-scan-throws-on-missing-cwd`) |
| Explicit dependencies (house §11) | Bites | `exists` parameter defaults to `existsSync`; tests pass a set-backed fake or use `createTree` |
| Single source of truth (house §8) | Bites | `TOP_SPEC_ROOT` reused inside `findProjectDir`; bash keeps its own `docs/specs` literal (separate runtime, documented as "same walk") |
| Extract on second use (house §9) | Bites | lesson pointer renderer beside `describeLesson` in `lessons/recall.ts`, with its own test |
| Humble object at the edge | Bites | `spec.ts` main block and both hook mains stay one-liners; logic in `findProjectDir` |
| SRP / OCP / LSP / ISP / DIP | Inert | no new types or ports |
| Dependency rule, components | Inert | hooks and spec.ts already depend on `core/` |
| DDD | Skipped | tooling, no domain model |

## Guard blindness

None claimed. The phase's "< 30K" is new: the fixture test must build the pack through `contextPack` (whole pack), not `projectLessonsBlock` alone.

## Seam and testability (deltas from recon)

- None over the cap: packs.ts 141 → ~150, spec-folders.ts 64 → ~80, recall.ts 24 → ~30.
- `spec-bump.test.ts` asserts the printed absolute path and that the file changed, not the time, so `TZ` only guards against a midnight edge; pass it anyway.

## Amendments

1. `playbooksBlock` clips the rendered block at `PLAYBOOKS_LIMIT = 3000` with the read pointer `docs/specs/_playbook/`.
2. Lessons heading carries the count: `### Project lessons for this phase's files (N match, most-seen first)`; body is pointers; note `M more lessons match; the edit hook shows each before its file changes, or run spec.ts lessons recall <file…>`.
3. The `lesson-recall` subfolder test edits a root-level file from a subfolder `cwd`.

## Defaults applied

- Pointer line keeps the seen-in count (`- <title> (\`<name>\`, seen in N specs)`): it's why one lesson ranks above another. Summary dropped.

## Forks for you

None.
