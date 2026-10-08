---
date: 2026-10-07
phase: 2
chunk: focus-set
---

# Phase 2 recon — focus field, rank, base-first writer

*Source of record — do not edit.* `T` = `skills/spec/tools`. Single inline wave at HEAD 11b19fc: the phase
entry and `technical.md` already name every file; this pins them.

## Seam
- `T/core/spec-meta.ts:4-23` `SpecMeta` / `readSpecMeta` — add `focus`, `owner`. `numberField` exists
  (`T/core/frontmatter.ts:59`), finite-only; `≥ 0` and the problem text are new.
- `T/doctor/spec-meta.ts:7-24` `checkSpecMeta` — pattern: `readSchedule(data).problems` → `error()`. Mirror
  it with one shared reader so the board, the doctor and the hook share the validity rule. Callers:
  `T/doctor/run.ts:47`, `T/hooks/spec-file-check.ts:53` (no new path regex needed).
- `T/core/frontmatter-patch.ts:6-19` `setFrontmatterLine` — key range + continuation scan to share with
  `removeFrontmatterLine`.
- `T/publish/snapshot.ts:67-83` `snapshotCommit` — scratch index → read-tree → `update-index -z --index-info`
  → write-tree → commit-tree. Extract as `commitOnto(git, base, indexInfo, message)`; snapshot feeds it
  `ls-tree -z HEAD -- files`, focus feeds it one `100644 blob <hash-object -w>\t<path>` entry.
- `T/publish/publish.ts:18` `NON_FAST_FORWARD` (private) and `:29-35` the two-attempt retry shape to mirror.
- Reading the set at the tip: `T/mainline/load.ts:30-51` pins, then `baseCache(git, sha, commonDir)`
  (`T/mainline/base-cache.ts:10`) + `rev-parse --show-prefix`. Extract `baseProject(git, sha)` →
  `{ commonDir, root, dir }` so land.ts reuses it with its own `pinDefault`; `loadNodes(dir)` gives
  `node.meta.focus` for every spec; `resolveSpec(dir, name)` gives the folder (and refuses duplicates).
  Repo path of the file = `relative(root, <spec dir>/CLAUDE.md)`; its tip text is the cached file.
- Command exemplar `T/commands/phase.ts` (ACTIONS, `parseArgs` strict, `<cmd> <action>: <reason>`);
  registration `T/spec.ts:27-48` (async `run` allowed). Default branch: `defaultBranch(cwd, runner)`
  (`T/core/run.ts:87`), `NO_DEFAULT_BRANCH` from `T/commands/push.ts`.

## Reuse
- `pinDefault`, `baseCache`, `loadNodes`, `resolveSpec`, `setFrontmatterLine`, `gitFailureReason`,
  `repoWithOrigin` / `clone` / `isolatedRunner` (`T/tests/git-repo.ts`). No new loader.

## Testing-issue estimate
- Rank + plan are pure: no fixtures needed.
- Land needs real git: bare origin + clones via `repoWithOrigin`; isolated runner mandatory. Race: wrap the
  runner so the first `push` first lets another clone push. Refusal: a `pre-receive` hook in the bare origin.
- Each real-git test ~0.5–1 s: keep land tests to the five named cases + command smoke.
- Sizes: snapshot.ts 83, publish.ts 62, spec-meta 23/24, frontmatter-patch 19 — no cap pressure.
