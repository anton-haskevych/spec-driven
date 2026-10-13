# Phase 4 recon — tools from any folder, pack budget

Single wave, read directly (small, known seam). Paths under `skills/spec/`.

## Seam

- `tools/core/spec-folders.ts:14` `TOP_SPEC_ROOT = "docs/specs"` (module-private). `findProjectDir` goes beside it; `existsSync` already imported.
- `tools/spec.ts:70` `run(..., process.cwd())` → `findProjectDir(process.cwd())`. `run()` itself keeps taking `projectDir` (tests call it directly).
- `tools/hooks/lesson-recall.ts:23` and `tools/hooks/spec-file-check.ts:86`: `const projectDir = typeof payload.cwd === "string" ? payload.cwd : fallbackDir;` → wrap in `findProjectDir`. spec-file-check resolves a relative `file_path` against `projectDir` (:87): Claude Code sends absolute paths, so re-rooting is safe.
- `scripts/spec-bump.sh:37-45` name branch: globs `docs/specs/$ARG/CLAUDE.md` and `*/docs/specs/$ARG/CLAUDE.md` relative to cwd; `$FILE` relative. Walk goes inside the `else` branch only.
- `tools/context/packs.ts:136-141` `projectLessonsBlock` renders `describeLesson` (title + name + seen-in + 400-char summary) for every matching lesson, no budget. `withinBudget` (:110) is the pattern; `ledgerBlock` (:96) the hidden-rows note shape.
- `tools/playbook/render.ts:4` clips each playbook at 4000; no total. `renderPlaybooks` is shared with `spec.ts playbooks` (`commands/playbooks`), so the 3K total clip belongs in `packs.ts` `playbooksBlock`, not in `renderPlaybooks`.

## Reuse

- `withinBudget`, `clip` (`context/text.ts`), `lessonsForFiles` (already sorts by seen-in count, so the budget keeps the most-seen lessons).
- A pointer renderer beside `describeLesson` in `lessons/recall.ts` (same shape minus the summary).
- Tests: `createTree` (`tests/tree.ts`) for spec-folders and spec-bump; `hook.test.ts:50` / `lessons.test.ts:60` payload builders for the hook subfolder cases; `context.test.ts` `contextPack` fixture (beforeAll project) for the whole-pack test.

## CRM baseline (execute pack per open spec, 92 packs, 2026-10-12)

- median 20,963 chars (lead-capture-widget), max 69,043 (temporal-correctness), 20 packs over 30K.
- Worst pack: project lessons 44,095 of 69,043; playbooks ~4.1K (settings + growth/backend sections). Lessons are the whole problem; ledger rows and code map are 3–6K each.
- Measured in-process with `contextPack(crm, { mode: "execute", name })`, no held phases.

## Testing issues

- spec-bump test spawns bash: pass `TZ` (`gotcha-bun-test-runs-in-utc-but-spawned-children-do-not`) — only matters if the test compares times; assert the file changed and the printed path instead.
- `findProjectDir` must not glob (`gotcha-bun-glob-scan-throws-on-missing-cwd`): use `exists` only, injectable for tests.
- A worktree's `.git` is a file: `createTree` can write one.
- `tmpdir()` on macOS is under `/var/folders/...`, which has no `docs/specs` or `.git` above it, so the "outside any tree" case returns `start`.
- No file near the 250-line cap: packs.ts 141, spec-folders.ts 64.
