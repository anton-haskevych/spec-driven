---
needs: [4, 5]
---

# Phase 11 — Derived project ledger index

**Goal:** Nothing writes `docs/specs/_ledger/INDEX.md` any more; every reader gets project lessons from the lesson files, so parallel branches never edit one shared file.

**Outcome:** PRs stop showing "This branch has conflicts" on `docs/specs/_ledger/INDEX.md`, and CI runs on them again. Small tool + prose change; the one-time cost is that open branches which touched the file merge main once.

**Why:** Phase 5's `merge=union` only works for local merges. GitHub's mergeability check ignores merge drivers, so a PR whose branch appended a project row conflicts as soon as another session's row lands on main. A conflicting PR also gets no `pull_request` runs (CRM `gotcha-conflicting-pr-runs-no-workflows.md`). In CRM the file took 131 commits in 30 days; no other `docs/specs/_*` file took more than 6.

**Files to touch:**
- `skills/spec/tools/lessons/add.ts` (drop the project INDEX from the plan)
- `skills/spec/tools/core/ledger-index.ts` (`formatProjectRow` loses its only caller)
- `skills/spec/tools/doctor/project-ledger.ts` (row check → leftover-file warning)
- `skills/spec/tools/commands/lessons.ts:79`, `doctor/project-lesson.ts:18` (messages)
- `skills/spec/SKILL.md` (*Project ledger*), `prep.md:176`, `review.md:162`, `create.md` (`.gitattributes`), `README.md:107`
- tests: `lessons-add.test.ts`, `ledger-index.test.ts`
- `docs/specs/_ledger/INDEX.md` in this repo (delete)

## Implementation guidance

No new command. Every code reader already uses `loadProjectLessons`. The prose readers switch to things that work without the file:
- Prep recon agents and the prior-art reviewer (Read/Grep/Glob only): grep `^paths:` in `docs/specs/_ledger/`. That gives one line per lesson (file + globs), the same as an INDEX row without its summary.
- The review orchestrator also passes `lessons recall <code-map files>` output to the prior-art reviewer.
- No-Bun write path, step 1: list `docs/specs/_ledger/` file names (slugs are descriptive).

`--summary` stays: it still shortens the spec ledger's pointer row.

The doctor's project-wide run warns while a leftover `_ledger/INDEX.md` exists ("nothing reads or writes it; delete it"), so other projects drop it as they go. The spec `ledger/INDEX.md` files and their union rule stay: one spec's sessions write them, not every branch.

## Deliverables

- [ ] `lessons add` no longer writes or validates a project INDEX row; `formatProjectRow` removed
- [ ] Doctor warns about a leftover project INDEX instead of checking its rows
- [ ] Prose readers (SKILL.md, prep.md, review.md, create.md, README) point at lesson files / `lessons recall`
- [ ] This repo's `docs/specs/_ledger/INDEX.md` deleted; `bun test` + `tsc` green
