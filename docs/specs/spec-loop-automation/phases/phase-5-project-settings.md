---
needs: [4]
pr: C
---

# Phase 5 — Project settings

**Goal:** A project declares its loop rules once in `docs/specs/_playbook/settings.md`; the plugin reads them, the doctor checks them and the repo's `.gitattributes`, `spec.ts gates --name` expands a named gate, and the draft rule, after-merge steps and bootstrap steps come from settings instead of hard-coded prose.

**Outcome:** No more re-arguing draft vs ready or rediscovering what to rerun after merging main; INDEX files stop conflicting. Projects without a settings file see no new warnings.

**Files to touch:**
- `skills/spec/tools/playbook/settings.ts` (new), `commands/settings.ts` (new); `spec.ts` table
- `skills/spec/tools/core/frontmatter.ts` (`booleanField`, `numberField`, nested-record accessor)
- `skills/spec/tools/commands/gates.ts` (`--name` form) + `tests/playbook.test.ts`
- `skills/spec/tools/doctor/settings.ts`, `doctor/gitattributes.ts` (new); `doctor/ledger.ts` (duplicates; project INDEX); `commands/doctor.ts` (:25-26)
- `skills/spec/tools/hooks/spec-file-check.ts` (:27,41 — route `_playbook/settings.md` to the settings check)
- `skills/spec/tools/context/packs.ts` (one-line `Settings:` summary)
- `skills/spec/execute.md` (:134 gates wording, :137, after-merge step), `SKILL.md` (:89, :401, *Tools*, *Playbook*), `create.md` (:241-242, `.gitattributes` scaffold), `review.md` (:335)
- `skills/spec/tools/tests/hook.test.ts` (:33 exact doctor output)

## Implementation guidance

Schema and defaults in `technical.md` → *Project settings*. `parseSettings` uses `core/frontmatter.ts`; unknown keys and wrong types become doctor warnings, never exceptions. `gates.after-merge-main` / `gates.bootstrap` must name existing `gates.md` sections (doctor error otherwise, same shape as `doctor/gates.ts:4-9`).

**Named gates.** `commands/gates.ts:6-11` only takes a spec name, so `gates merge-main` today prints "no spec named merge-main". Add `gates --name <g…>` on `loadGates`; fix `execute.md:134` and SKILL.md:89, which already describe it as `gates <name>`.

**Repo-level doctor lines.** Only when `_playbook/settings.md` exists (other projects keep today's output). `doctor/gitattributes.ts` asks git: `git check-attr merge -- <a root spec INDEX> <a */docs/specs INDEX>` must say `union` (no git → skip). In spec-scoped runs these lines come **after** the spec's own issues, one line each, so the pack's 6-line clip (`commands/context.ts:22`) keeps spec issues.

**INDEX rows.** Extend `checkLedgerIndex` (`doctor/ledger.ts:29-39`) to count rows instead of collecting a Set, so duplicates (union-merge failure mode) show as warnings; run the same check on the project `_ledger/INDEX.md` using phase 4's parser, plus pointer rows whose `docs/specs/_ledger/…` target is missing. No new `index-rows.ts` — missing-file rows are already an error there.

**Mode prose.** Execute §10 reads `pr.draft` (default draft); after merging main, run `spec.ts gates --name <gates.after-merge-main>` when set; execute §0 runs `gates --name <gates.bootstrap>` when the worktree is fresh (the gate text defines "fresh"). Merging stays the user's call; when they say merge, use `pr.merge` (and `gh api …/merge` from a worktree, where `gh pr merge` fails). `create.md` scaffolds both union rules via `isSpecDocPath`'s two roots.

## Deliverables

- [x] `parseSettings`/`loadSettings` with defaults + frontmatter field helpers; `spec.ts settings`
- [ ] `gates --name` form; wording fixed in execute.md and SKILL.md
- [ ] `doctor/settings.ts` (types, unknown keys, gate names); settings.md checked on write by the spec-file hook
- [ ] `doctor/gitattributes.ts` via `git check-attr`, only with settings.md; repo lines after spec lines; exact-output tests updated
- [ ] `checkLedgerIndex` duplicates + project INDEX + pointer rows
- [ ] Pack `Settings:` line
- [ ] Draft / after-merge / bootstrap / merge-method prose reads settings (execute, SKILL.md, create, review)
- [ ] `create.md` adds both union rules to `.gitattributes` when missing

## Phase-local notes

Phase 9 also edits `context/packs.ts` and execute §10. If both run in parallel worktrees, land one and rebase the other.
