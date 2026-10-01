---
date: 2026-10-01
wave: 1
lens: implementation
slug: sources-and-layers
brief: product-brief.md
---

# Recon Wave 1 — sources and layers

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Three agents: layering and wiring, git mechanics and tests, sessions and PRs. Paths relative to
`skills/spec/tools/` unless they start with `skills/` or `~`. Probes ran on CRM (git 2.54) 2026-10-01.
Corrections to wave 0 are marked **(corrects wave 0)**.

## Verified

### Layers today
- Pure: `graph/{relations,neighborhood,overlap,render}.ts`, `ready/*`, `portfolio/*`, `pr/{checks,gh-records,render}.ts`,
  `context/status-table.ts`, `launch/*`, `core/spec-state.ts:specStateFrom`.
- IO: disk through `core/files.ts:readTextIfExists` + `core/spec-folders.ts:listSpecs` (Bun.Glob);
  git/gh through the sync `Runner` (`core/run.ts:13-15`), used in 9 non-test modules.
- Best exemplar is `pr/`: `GhClient` interface (`pr/gh.ts:7-14`) + parsers (`gh-records.ts`) + renderer.
  It breaks the pattern: `buildReport` pulls from gh inside the core (`pr/report.ts:39,49,59`), `resolvePr`
  reads disk (`resolve.ts:29-30`), no `--json`.
- `portfolio/` + `commands/list.ts` is source → pure rows/order → render + `--json` (`list.ts:23-26`), but the
  source is hard-wired to `loadNodes(projectDir)`, and `specRow.root` is relative to `projectDir` (`rows.ts:27`).
- `context/packs.ts:executePack` reads disk itself (`:57-70`), the impure outlier.
- No module reads more than one workspace. No types exist for workspace, session, claim, PR-by-branch, lane.

### Reading specs without a disk folder
- `specStateFrom(spec, read: ReadSpecFile)` (`core/spec-state.ts:34-46`) already takes a reader.
  `loadNode` (`graph/nodes.ts:36-50`) and `listSpecs` (`core/spec-folders.ts:19-28`) don't: disk only.
- Files the board needs per spec: `CLAUDE.md`, `progress.md`, `code-map.md`, `in-flight.md`, and each phase
  entry a progress line points to (`spec-state.ts:49`). One CRM pointer leaves `phases/` (`../ci-optimization/`).
  Plus the backlog `docs/specs/_backlog/*.md` (`backlog/items.ts:6,21-25`).
- CRM spec roots on `origin/main`: 12,531 files, 501 MB (raw captures under research/). Never pull whole roots.
- `git ls-tree -r <ref>` + filter + `git cat-file --batch` for the needed files (2,853 blobs): 0.15 s, no disk.
  `ls-tree` rejects `:(glob)` pathspecs; filter after listing. `git archive` takes `:(glob)` (0.22 s for
  `*/*.md` + `*/phases/*.md`, plus 0.6 s to extract).
- `loadNodes` keeps the first spec per name (`nodes.ts:31`); an overlay needs its own merge rule.

### Workspaces
- `git worktree list --porcelain`: 0.03 s, 64 entries (58 branch, 6 detached, 0 prunable, 0 locked).
- `git for-each-ref --format='%(refname:short) %(ahead-behind:origin/main)' refs/heads`: all 79 branches, 0.16 s.
  `for-each-ref --merged origin/main`: 0.09 s. `git rev-list --no-walk <sha…> ^origin/main` sorts detached
  HEADs in one call. Result: **43 of 64 skippable, 21 live.**
- CRM is a **shallow clone**: 4 old branches have no merge base; `log origin/main..B` returns 177–246 junk
  paths, `diff origin/main...B` fails `no merge base`.
- Committed spec-doc paths per branch: `git diff --name-only origin/main...B -- <roots>` ≈ 0.1 s each
  (2.0 s serial for 21). The one-call `log --source B1 B2 … --not origin/main` credits a shared commit to one
  branch only, so per-branch lists come out incomplete.
- Uncommitted: `git --no-optional-locks -C <wt> status --porcelain --untracked-files=all -- <roots>`;
  21 live worktrees with `xargs -P8`: 0.5–0.7 s. All 64: 3.8–4.7 s. **`--no-optional-locks` is required**,
  or `status` can rewrite the index under another session.
- `git rev-parse --path-format=absolute --git-common-dir` is the same absolute path from every worktree and
  from nested roots. Files there survived `gc --prune=now --aggressive`, `worktree prune`, `reflog expire`,
  `fsck`. Nothing in spec-driven uses it yet.
- Freshness: local `origin/main` was behind (`ls-remote` 0.9 s returned a newer sha). `FETCH_HEAD` is per
  worktree and its mtime doesn't mean "last fetch". Prior art for fetch + pin: `publish/snapshot.ts:25 pinDefault`.

### Sessions **(corrects wave 0)**
- `~/.claude/sessions/<pid>.json` exists per open session: `{pid, sessionId, cwd, startedAt, kind, name,
  status: busy|idle, updatedAt}`. 11 found, all PIDs alive; files appear to go away when a session exits.
  This is the liveness signal. `name` is the `-n` label (`gift-cards prep`).
- Process cwd = start directory, which can be a worktree (wave 0 saw only main-started sessions).
- A session that runs `EnterWorktree` keeps its transcript under the **main** checkout's folder; its
  transcript has `{"type":"worktree-state","worktreeSession":{"worktreePath":…,"sessionId":…}}`, and `cwd`
  fields follow the shell (subfolders, `cd`). Matching cwd → worktree needs a longest-prefix rule.
- Transcript folder encoding: every non-alphanumeric → `-`, not reversible. Encode worktree paths and compare.
- `CLAUDE_CODE_SESSION_ID` is set in every Bash tool subprocess (docs + probe); subagents get the parent's
  id. `${CLAUDE_SESSION_ID}` substitutes only in SKILL.md itself, not linked mode files; Bash env works anywhere.
  `prep.md:302` already uses the env var.

### Pull requests **(corrects wave 0)**
- `gh pr list --state all --limit 50` **with** `statusCheckRollup`: 8.4 s, 460 KB. Open only with rollup:
  1.6 s (15 PRs). All states **without** rollup: 0.7 s. `--state all` does not list open PRs first.
- Rollup items: `CheckRun {name, workflowName, status, conclusion, detailsUrl}` and
  `StatusContext {context, state, targetUrl}` (Vercel). No `bucket`; the board must map to `pr/types.ts:1`
  buckets itself to reuse `summarizeChecks` (`pr/checks.ts:13-19`, external globs match `name`).
- `mergeable` / `mergeStateStatus` come back `UNKNOWN` in `pr list` (GitHub computes lazily). `prState`
  (`checks.ts:22-31`) needs `mergeable`, so merge conflicts stay a `pr-status` concern.
- Merged PRs keep `headRefName` after the branch is deleted. `reviewDecision` is empty for all 50.
- Nothing links a PR to a phase. `specPrNumbers` (`pr/resolve.ts:15-20`) reads PR numbers per spec from
  `pr-opening.md`. Deployed markers are per phase in `progress.md` (`core/progress.ts:10-14,29`).

### Wiring points
- `list.md:5-18` (tool call, print as given), `:20-36` no-Bun fallback; `SKILL.md:51,65,98`.
- `execute.md:16-25` pick (line 21 already names parallel phases); per-session steps go in §1 (`:37`), since
  resume enters at §1 (project lesson). Pick is `context.ts:58-66` → `packs.ts:55-60` (`Picked:` line).
- `handoff.md:155-172` final block, `Unblocked:` at 167, "Next agent should run" at 168.
- `resume.md:50-72` A.4 bullets (71 blocked-by, 72 also-ready). Resume pack `packs.ts:36-53`, related specs
  via `neighborhoodReport` (`context.ts:47`).
- `launch/command-line.ts:17-27` takes `[subCommand, specName]` only.

### Conventions and tests
- CI: `bun test` + `tsc --noEmit` (`strict`, `noUncheckedIndexedAccess`). File < 250 / function < 50 lines are
  prose rules (`principles.md:23-25`), not enforced.
- Keeping the board under `list` avoids `tests/skill-wiring.test.ts:86-111`'s new-sub-command requirements.
  `tests/commands-table.test.ts:16-18` calls `run()` synchronously.
- Stubs: `tests/stub-runner.ts` (argv-prefix replies + recorded calls), `sequencedRunner` in
  `tests/pr-report.test.ts:16-28`, fixtures `tests/fixtures/gh-*.json`, factories `tests/factories.ts`
  (no PR/session/workspace factories), `tests/tree.ts:createTree`, `tests/git-repo.ts:repoWithOrigin`
  (no worktree helper; `HOME` never stubbed, but `options.env` passes through `core/run.ts:24`).
- Project lessons that apply: real-git tests cost 0.5–1 s each (keep logic in pure parsers);
  `bun test` runs in UTC while children use local time (recency math); execute steps go in §1.

## Reuse
- Types: `SpecNode`, `PhaseMark`, `Relation`, `SpecState`, `PhaseState`, `ReadySet`, `Waiting`, `isWip`,
  `SpecRow`, `PrState`, `Link`/`blockers()`, `Overlap`/`specsTouching` (note `HUB_LIMIT = 5`), `Result<T>`.
- `specStateFrom` reader seam; `readySet` across specs via `nodes`; `orderSpecs` ranking; `summarizeChecks`
  after a rollup → bucket map; `specPrNumbers`; `gitAt`; `pinDefault`; `stubRunner`; `repoWithOrigin`.
- Must build: a spec-docs reader that isn't a folder (git blobs, a worktree path), workspace listing and
  classification, session index, claims store, PR-by-branch source, lanes, rank, terminal view, an async
  runner (separate type; leave `Runner` alone).

## Neighbors
`spec.ts graph files` has nothing to match: no open spec in this repo lists these tools in its code-map.
- `spec-loop-automation` (done): built the ready set, packs and `pr-status` the board reads → `related`.
- `spec-spin-off` (done): built `launch`; the board's "start these rows" extends it → `related`.

## Still open (none critical; decisions for create)
- Fetch policy: fetch every run (~1 s, needs network) vs `ls-remote` check then fetch only when stale.
- Branches with no merge base (shallow clone): show as "unknown base" and skip their paths.
- Whether to read `worktree-state` lines from transcripts to place main-started sessions, or rely on
  claims (which record the worktree) plus `sessions/<pid>.json`.
- `prunable` / `locked` porcelain lines are unverified locally (docs: `locked [reason]`,
  `prunable <reason>`); the parser must accept them.
- Side finding, not this spec: `prep.md:297` uses `${CLAUDE_SKILL_DIR}` in a linked file, where the docs
  say it is not substituted.
