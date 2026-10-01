# Phase 5 preflight — project settings

Inputs: `phases/phase-5-project-settings.md`, `research/phase-5/2026-09-30-project-settings-recon.md`, `technical.md` → *Project settings*, *Doctor additions*, `principles.md`.

## Findings that change the plan

1. **Schema knowledge would live twice.** technical.md has `parseSettings(text): ProjectSettings` and a separate `doctor/settings.ts` that "validates types, unknown keys". Two readers of one schema drift (principles.md §8). `parseSettings` returns `{settings, problems}`: one walk over a key table applies defaults and collects type/unknown-key problems; `doctor/settings.ts` turns `problems` into warnings and adds the gate-name errors.
2. **Pointer rows resolve from the repo root, which the doctor doesn't know.** `DoctorContext` (`doctor/run.ts:19-25`) has no `projectDir`; a spec under `landing/docs/specs/` still points at `docs/specs/_ledger/…` from the root. Add `projectDir` to the context; `checkLedgerIndex` takes a `pathExists` callback for `/` rows.
3. **`checkLedgerIndex` has a third caller.** `lessons/add.ts:95-96` (phase 4) validates INDEX edits with it; the new pointer check must get `pathExists` there too, or it silently skips pointer rows in the planned text.
4. **Settings presence must be a value, not a re-read.** Pack line, doctor repo lines and the gitattributes check all key on "settings.md exists". `loadSettings` returns `file?: string` so callers branch on it once.

## Canon (non-inert rows)

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | `playbook/settings.ts` parse/defaults; `playbook/settings-summary.ts`? no — one `describeSettings` beside the parser, used by `spec.ts settings` and the pack |
| Errors as values | Bites | bad types → `problems` strings, never throws; `git check-attr` failure → no issue (skip) |
| DIP | Bites | `gitattributesIssues(projectDir, runner)` takes the `Runner` seam (`core/run.ts`) |
| OCP | Bites | key table (`docs`, `pr.draft`, `pr.merge`, `checks.external`, `gates.*`, `nudge-at`) — a new key is one row |
| Small functions | Bites | `commands/doctor.ts` grows a `repoIssues(projectDir, settings)` helper, not inline branches |

Clean Architecture: `core/` stays free of `doctor/` imports; `playbook/settings.ts` imports `core/frontmatter.ts` only. DDD skipped (tooling).

## Amendments

1. `parseSettings(text) → {settings, problems}`; `loadSettings(projectDir) → ProjectSettings & {file?}`; `describeSettings(settings)` one line, shared.
2. `DoctorContext.projectDir`; `checkLedgerIndex(file, text, entries, pathExists?)`; `lessons/add.ts` passes it.
3. `gates.after-merge-main`/`gates.bootstrap` naming a missing section → error (mirrors `doctor/gates.ts`); everything else → warning.

## Decisions for you

None.
