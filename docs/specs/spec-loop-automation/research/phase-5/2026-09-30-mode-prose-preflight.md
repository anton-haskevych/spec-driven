# Phase 5 — deliverables 7–8 preflight (mode prose reads settings)

Self-scaled: a prose-only chunk. Passes B (Clean Architecture) and D (DDD) are skipped: no code, no domain model.

## Findings that change the plan

1. **The bootstrap step can't live in execute §0.** `execute.md:9` says the resume path *skips the rest of §0* and starts at §1 (`resume.md` → B.5 hands off at *Load the principles*). A bootstrap gate in §0 would only run on direct `/spec execute`. It goes at the top of §1, which both paths run.
2. **Stale anchors in the phase entry.** The pack's `Settings:` line is built in `commands/context.ts:71-72`, not `context/packs.ts`. The SKILL.md draft wording is at `:406`, not `:401`. Neither changes the work; the prose cites settings by name, not by file.
3. **The pack line only appears when `settings.md` exists** (`commands/context.ts:72`). Execute prose must read "no `Settings:` line → plugin defaults" so it never makes an extra `spec.ts settings` call. Only modes without a pack (create, review) call `spec.ts settings`.

## Clean Code against the prose

| Rule | Verdict | Consequence |
|---|---|---|
| One word per concept | Bites | Use the setting keys (`pr.draft`, `pr.merge`, `gates.bootstrap`, `gates.after-merge-main`, `docs`) everywhere, matching `describeSettings` and `technical.md`. |
| DRY | Bites | create.md quotes `UNION_RULES` (`doctor/gitattributes.ts:5`) verbatim; gate contents are never restated, only `gates --name`. |
| Small functions / size caps | Inert | Markdown; execute.md is 158 lines. |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| OCP | Bites | Each step says "when `<key>` is set", so a project without settings.md keeps today's behaviour (design.md:30). |
| Others | Inert | — |

## Seam and testability

No deltas from the recon: no production code, no pinned prose lines. Full suite once after the edits.

## Amendments

1. Bootstrap gate → top of execute §1, phrased for both entry paths.
2. Execute §10 reads settings from the pack's `Settings:` line; absent → defaults (draft PR, merge method: ask).
3. create.md and review.md, which get no pack, use `spec.ts settings` or read `docs/specs/_playbook/settings.md`.

## Decisions for you

None.
