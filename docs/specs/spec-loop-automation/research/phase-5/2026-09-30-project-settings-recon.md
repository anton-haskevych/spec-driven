# Phase 5 recon — project settings (whole phase)

Single inline wave; the phase entry and technical.md name every file.

## Seam

- `playbook/gates.ts:25` `loadGates(projectDir)` → `Map<name, checks>`; `commands/gates.ts:6-23` takes only a spec name; `spec.ts:29` usage `gates <spec-name>`.
- `doctor/gates.ts:4-9` — the error shape settings gate names copy (`gates.md` missing → one error; unknown name → one error each).
- `commands/doctor.ts:24-26` — spec-scoped runs return spec issues only; project-wide runs prepend `projectLedgerIssues`, `backlogIssues`, `playbookIssues`. Settings + gitattributes lines append after spec issues (spec-scoped) and join the project list (project-wide).
- `doctor/run.ts:19-25` `DoctorContext` has no `projectDir`; pointer rows (`docs/specs/_ledger/…`) resolve from the repo root, so the context gains it.
- `doctor/ledger.ts:5,29-39` — Set of `/`-free file names; callers: `doctor/run.ts:60`, `lessons/add.ts:95-96`, `tests/doctor.test.ts:53`.
- `doctor/project-ledger.ts:10-19` — checks lessons only, never the project INDEX.
- `hooks/spec-file-check.ts:27,41` — `_playbook/*.md` → `checkPlaybook`, which returns `[]` without `match:`; settings.md needs its own route ahead of it.
- `playbook/playbooks.ts:24-30` skips files without `match:`, so settings.md is never injected as a tag playbook (no change needed).
- `context/packs.ts` `resumePack`/`executePack` take `PackInput`; `commands/context.ts:52,65` builds it. `DOCTOR_LINES = 6` clips the doctor block.
- `core/run.ts` `Runner` seam + `systemRunner`; `tests/stub-runner.ts` exists for git stubs.
- `core/frontmatter.ts` has `stringField`/`stringList`/`isRecord`; `Bun.YAML` already yields booleans, numbers and nested maps.

## CRM (first adopter)

`_playbook/` holds only `growth.md`; no `settings.md`, no `.gitattributes` yet → CRM's doctor output is unchanged until phase 10.

## Testing-issue estimate

- `git check-attr` needs a git repo: use `tests/stub-runner.ts` for unit tests; one `tests/git-repo.ts` integration test for the real command.
- `hook.test.ts:33` exact output stays (its fixture has no settings.md); add a settings fixture beside it.
- Size: `commands/doctor.ts` 32, `doctor/ledger.ts` 39, `packs.ts` 125 — headroom everywhere.
