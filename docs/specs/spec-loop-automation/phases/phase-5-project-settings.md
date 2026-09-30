---
needs: []
pr: C
---

# Phase 5 — Project settings

**Goal:** A project declares its loop rules once in `docs/specs/_playbook/settings.md`; the plugin reads them, the doctor checks them and the repo's `.gitattributes`, and the draft rule, after-merge steps and bootstrap steps come from settings instead of hard-coded prose.

**Outcome:** No more re-arguing draft vs ready or rediscovering what to rerun after merging main; INDEX files stop conflicting. Risk: a repo-level warning in every spec-scoped doctor run — capped to one line each.

**Files to touch:**
- `skills/spec/tools/settings/project-settings.ts` (new), `commands/settings.ts` (new); `spec.ts`
- `skills/spec/tools/doctor/settings.ts`, `doctor/gitattributes.ts`, `doctor/index-rows.ts` (new); `commands/doctor.ts` (:25-26)
- `skills/spec/tools/context/packs.ts` (one-line `Settings:` summary)
- `skills/spec/execute.md` (:137 + after-merge step), `SKILL.md` (:401, *Tools*, *Playbook*), `create.md` (:241-242, `.gitattributes` scaffold), `review.md` (:335)
- `skills/spec/tools/tests/hook.test.ts` (:33 exact doctor output)

## Implementation guidance

Schema and defaults in `technical.md` → *Project settings*. `parseSettings` uses `core/frontmatter.ts`; unknown keys and wrong types become doctor warnings, never exceptions. `gates.after-merge-main` / `gates.bootstrap` must name existing `gates.md` sections (doctor error otherwise).

Repo-level checks (gitattributes, settings) join spec-scoped doctor output — today they run only with no spec name (`commands/doctor.ts:26`), so the loop never sees them. Keep each to one line so the pack's 6-line doctor clip still shows spec issues.

`doctor/index-rows.ts` catches union-merge failure modes: duplicate rows and rows whose file is missing, for spec INDEX files and the project `_ledger/INDEX.md` (parser from phase 4 if landed; otherwise a local parse, consolidated when 4 lands).

Mode prose: execute §10 reads `pr.draft` (default draft); after merging main, run `spec.ts gates <gates.after-merge-main>` when set; execute §0 runs `gates <gates.bootstrap>` when the worktree is fresh (no dependency install yet — the gate text defines "fresh"). Merging stays the user's call; when they say merge, use `pr.merge` (and `gh api …/merge` from a worktree, where `gh pr merge` fails).

## Deliverables

- [ ] `parseSettings`/`loadSettings` with defaults; `spec.ts settings`
- [ ] `doctor/settings.ts` (types, unknown keys, gate names)
- [ ] `doctor/gitattributes.ts` + repo-level warnings in spec-scoped doctor; exact-output tests updated
- [ ] `doctor/index-rows.ts` duplicate and missing-file rows
- [ ] Pack `Settings:` line
- [ ] Draft / after-merge / bootstrap / merge-method prose reads settings (execute, SKILL.md, create, review)
- [ ] `create.md` adds the union rule to `.gitattributes` when missing
