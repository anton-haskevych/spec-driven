# Phase 7 recon — publish and push (whole phase, one chunk)

Single inline wave: Stage B context made the seam obvious. Paths relative to `skills/spec/tools/`.

## Seam

- `core/run.ts:15-41` — `Runner` (argv, cwd, env, stdin) and `defaultBranch()`; every git call goes through it. `env` lets the snapshot set `GIT_INDEX_FILE`; `stdin` feeds `update-index -z --index-info` in one call.
- `core/spec-folders.ts:13-14` — `SPEC_ROOT_PATTERNS` covers `docs/specs/*` and `*/docs/specs/*`; no `isSpecDocPath` yet. Add it here (technical.md → *Spec-doc paths*); include `_ledger`, `_playbook`, `_backlog` (they are spec docs).
- `context/infer-spec.ts:7-37` — inline `git` closure + merge-base pattern to mirror; it is the only other git caller.
- `pr/gh.ts:5` — `GhResult<T> = {ok,value}|{ok:false,reason}`; used by `pr/resolve.ts`, `pr/report.ts`, a test. publish needs the same shape → second use.
- `commands/pr-status.ts` — thin command adapter to mirror (`(projectDir, args, runner = systemRunner) → string`).
- `spec.ts:22-34` — `COMMANDS` table; `tests/commands-table.test.ts` pins usage text starting with the name.
- `playbook/settings.ts:37` — `loadSettings(projectDir).docs` (`main | branch`).
- `tests/git-repo.ts:24-58` — `repoWithOrigin` (bare origin + clone, isolated identity). No second clone helper and no way to add `.gitattributes` union before first commit except `write` + `commitAll`.
- Mode files: `handoff.md:115-160` (§3 Commit, §4 Signal completion), `update.md:169-177` (§9 Close the phase), `SKILL.md:94` (*Remote* bullet holds only pr-status).

## Reuse

- `Runner`, `defaultBranch`, `loadSettings`, `repoWithOrigin` — reuse as is.
- Result shape: lift `GhResult` to `core/result.ts` (`Result<T>`) instead of a third copy.
- `git merge-tree --write-tree --name-only --no-messages` (git 2.54 local; ≥2.38 needed) gives tree + conflicted names natively — no hand merge.
- `git ls-tree -z HEAD -- <files>` + `git update-index -z --index-info` → whole snapshot in two calls, HEAD blobs only.

## Testing-issue estimate

- No helper for a second clone of origin (needed to move `main` concurrently) → add `clone()` to `git-repo.ts` (tiny, test-only).
- "main moved between steps" / "non-ff once" need a runner that intercepts one argv (`merge-tree`) and moves origin first → a test-local wrapper around `systemRunner`; no production seam needed.
- "Other rejection" → a `pre-receive` hook in the bare origin that rejects `refs/heads/main`.
- Pure parts testable without git: `isSpecDocPath`, `--name-status -z` parse, `ls-tree -z` → index-info lines, merge-tree output parse, push-rejection classify, `Remote:` line render.
- Size: all new files start empty; `spec.ts` is 59 lines; `commands-table` test auto-covers new entries.
- No timezone-sensitive code (bun UTC gotcha not in play).
