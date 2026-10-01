# Phase 5 — deliverables 7–8 recon (mode prose reads settings)

Single inline wave: the seam was named by the phase entry and `technical.md` → *Mode-file changes*; the code it calls already exists (deliverables 1–6).

## Seam

| Where | Today | Becomes |
|---|---|---|
| `execute.md` §0.3 (after Stage B load) | nothing about worktree setup | when `gates.bootstrap` is set and the worktree is fresh, run `spec.ts gates --name <bootstrap>` |
| `execute.md:137` §10 step 4 | "Open the PR as a **draft**" | draft or ready per `pr.draft` (default draft) |
| `execute.md` §10 | no after-merge or merge-method step | after merging main → `gates --name <after-merge-main>`; when the user says merge → `pr.merge` (unset → ask), `gh api …/merge` from a worktree |
| `SKILL.md:406` *pr-opening.md semantics* | "Ticked before the **draft** PR opens" | "before the PR opens (draft unless settings say `pr.draft: false`)" |
| `create.md:241-242` pr-opening template | "before opening the **draft** PR" | same settings-aware wording |
| `create.md` *After writing* | no repo-level scaffold | add `UNION_RULES` (`tools/doctor/gitattributes.ts:5`) to `.gitattributes` when missing |
| `review.md:335` §6 | "do not push unless the project's conventions say otherwise" | don't push; handoff pushes (and publishes when `docs: main`, phase 7) |

Settings reach a mode two ways: the resume/execute packs carry a `Settings:` line (`context/packs.ts`), and `spec.ts settings` prints `describeSettings` (`playbook/settings.ts:65-75`) for modes with no pack. No-Bun fallback: read `docs/specs/_playbook/settings.md` frontmatter.

## Reuse

- `spec.ts gates --name` (deliverable 2) is the only expansion path; prose must not restate gate contents.
- `UNION_RULES` is the single source for the two lines; create.md quotes them verbatim.

## Testing-issue estimate

- Prose only; no production code. `tests/skill-wiring.test.ts` pins SKILL.md's sub-command set and dispatch table, not the lines edited here. Run the full suite once after the edits.
- `describeSettings` words ("PRs draft|ready", "merge: ask the user") are what sessions will see; prose should use the setting names (`pr.draft`, `pr.merge`) so both fallback paths read the same.
