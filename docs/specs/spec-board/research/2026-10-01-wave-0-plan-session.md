---
date: 2026-10-01
wave: 0
lens: inherited
from: plan session (no parent spec; the plan page linked in CLAUDE.md)
slug: plan-session
brief: product-brief.md
---

# Recon Wave 0 — plan session

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Findings from the session that designed the board, with probes run against CRM on 2026-10-01.
Paths are relative to `skills/spec/tools/`.

## Verified

- `commands/list.ts:13-28` builds rows from `loadNodes(projectDir)` and renders `portfolio/render.ts`.
  `projectDir` is the session cwd, so every view reads the checkout it runs in.
- `graph/nodes.ts:28-34` `loadNodes(dir)` globs `docs/specs/*/CLAUDE.md` and `*/docs/specs/*/CLAUDE.md`
  (`core/spec-folders.ts:13`) under any directory. It parses any folder of spec docs, including a
  materialized git tree.
- `ready/ready-set.ts:16-27` `readySet(state, nodes)` is per spec and already resolves cross-spec
  `needs` refs through `nodes`. Wip = some sub-items ticked (`isWip`, line 29).
- `context/infer-spec.ts:7-17` `specsInPlay(dir, runner)` maps a checkout to specs through spec-doc
  paths in branch commits plus uncommitted files. It runs `git status --untracked-files=all` on the
  whole tree, which is too slow to repeat per worktree (below).
- `pr/resolve.ts:18-22` `specPrNumbers(prOpening)` pulls PR numbers from `pr-opening.md`'s Spec state.
  `pr/gh.ts:20` the gh client has a 30-call budget; `prView` is one call per PR.
- `core/run.ts:17-30` `systemRunner` is sync (`Bun.spawnSync`); there is no parallel runner.
  `spec.ts:22-25` `Command.run` returns `string`, and the entry point (`spec.ts:61-66`) already uses
  top-level await.
- `launch/command-line.ts:17-26` `launch <sub-command> <spec>` takes no phase hint. Sessions it opens
  start in the main checkout (`projectDir`).
- `playbook/settings.ts:16` `docs: main | branch`; CRM has no `settings.md`, so it uses the default.

## CRM probes (2026-10-01)

- `git worktree list`: 64 checkouts (`~/claude-worktrees/crm/*`, `~/.codex/worktrees/*`), many merged
  or detached.
- Full `git status --porcelain` in each, serial: 27 s. Scoped to `docs/specs`, serial: 7 s.
  `git log --name-only origin/main..HEAD` in each, serial: 7.4 s.
- `gh pr list --state open --json number,headRefName,isDraft,state`: 0.7 s, 15 open PRs.
- `lsof -a -d cwd -c claude`: both running Claude processes had cwd = the main checkout, so process
  cwd can't show which worktree a session works in.
- Transcripts live in `~/.claude/projects/<path with non-alphanumerics as ->/<session>.jsonl`. 60
  CRM worktree folders exist; mtimes track activity (alert-noise-cleanup-pr-a: 13:10 today).
- `spec.ts list`: 30 open specs, 14 of them p1, and only 13 with phase progress.

## Decided in the plan session (recommended, user approved the plan)

- Base = default branch tip via `git archive` into a temp folder keyed by commit, parsed by the
  unchanged `loadNodes`. Overlay = each worktree's unmerged spec-doc changes. Never trust cwd.
- Claims as JSON in `<git-common-dir>/spec-board/claims/`, created with exclusive create; execute
  claims, update heartbeats, handoff releases. Never committed.
- One `gh pr list --state all` call joined by branch, instead of `prView` per PR.
- `/spec list` defaults to the board; no new user-facing command.
- Rollout: read-only board → PRs + activity → claims → loop wiring.

## Still open

- Does the skill text expand `${CLAUDE_SESSION_ID}` (or `$CLAUDE_CODE_SESSION_ID` in Bash)? It decides
  whether a claim can name its session.
- Cheapest way to tell "merged and clean" worktrees apart before scanning them (`git branch --merged`
  in one call vs per-worktree checks).
- Does `git archive` with both spec-root pathspecs work on nested roots (`landing/docs/specs`), and is
  `git fetch` per board run acceptable, or should it reuse a fetch younger than N minutes?
- How `statusCheckRollup` summarizes CI in one call, and whether external checks (settings) need the
  same split `pr-status` does.
- Test harness: does `tests/git-repo.ts` support adding worktrees, and how do tests stub `HOME` for
  transcript folders?
