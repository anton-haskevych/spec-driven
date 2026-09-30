---
date: 2026-09-30
wave: 1
lens: implementation
slug: loop-mechanics
brief: product-brief.md
---

# Recon Wave 1 — loop-mechanics

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Paths are relative to `skills/spec/` unless prefixed. Four agents: session start + hooks, spec-file writers, git/PR + settings, CRM + global-hooks prior art.

## Verified

### Session start / context pack
- `SKILL.md:24-27` pipes raw `$ARGUMENTS` to `spec.ts context -` (stdin, `spec.ts:39-42`); silent without bun (PR #2 shape, pinned by `tests/skill-wiring.test.ts:44-79`).
- `tools/commands/context.ts:24-31` `parseContextRequest`: first token a sub-command → `name = tokens[1]`, hint = rest; last token a sub-command → `name = tokens[0]`, middle tokens dropped, no hint; else `route`.
- `context.ts:34-36`: no name, or not exactly one match → `""` (pack silently absent). `:40` also requires `progress.md` + `ledger/INDEX.md`.
- `core/spec-folders.ts:30-32` `findSpecs` is exact `===`; no trim/punctuation strip/case fold.
- Failures: bare `execute` → undefined name; `execute phase15` / `execute 3` → name `phase15`/`3` → no match; `my-spec.` → no match; `x phase 2 execute` → hint lost.
- **Parse is duplicated:** `SKILL.md:36-49` prose defines the same rule plus an execute exception (chunk reference in the name slot → whole remainder is the hint, spec inferred) that the tool does not implement. Only `skill-wiring.test.ts:81-93` keeps the sub-command *set* in sync, not the rules.
- `context.ts:70-74` `phaseForHint` already handles `phase N`, `next`.
- `locateSpecFile` (`core/spec-folders.ts:34-40`) maps any path → spec; reusable for a path-based fallback. No git calls or mtime reads exist anywhere in `tools/`.
- `SKILL.md:74` "Nothing else guesses it: not the branch, not the worktree" — a path-based fallback must reword this.
- `resume.md:110-118` B.0 runs `spec.ts context execute <name> <phase>` by hand; `resume.md:152-154` jumps into `execute.md` §1. Direct `/spec execute` with no pack falls back to hand reads (`execute.md:5-31`).

### Hooks
- `SKILL.md:6-17`: PreToolUse `Write|Edit|MultiEdit` → `hooks/lesson-recall.ts`; PostToolUse same matcher → `hooks/spec-file-check.ts`. Both fail open, 10s timeout.
- Both return early unless `tool_name` ∈ `WATCHED_TOOLS` and `tool_input.file_path` exists — Bash (`tool_input.command`) is never seen. Sessions made ~225 python-heredoc + 46 `sed -i` edits vs 12 Edit calls.
- `spec-file-check.ts:79-92` blocks on errors only; covers spec CLAUDE.md, phase files, ledger entries, `_ledger`/`_backlog`/`_playbook` (doc drift: `SKILL.md:86` lists fewer).
- `lesson-recall.ts:37-44` has a per-session temp-file memory keyed by `session_id` — reusable for a once-per-session nudge.
- Plugin has zero runtime deps (`package.json`, ROADMAP.md:18-20); no shell tokenizer. `~/.claude/hooks/lib/shell/tokenize.ts` (shlex) is user-level, not reusable in the plugin.
- Every hook payload carries `transcript_path` + `session_id` (`~/.claude/hooks/REFERENCE.md:15-19`); assistant transcript lines carry `usage` (input + cache_read + cache_creation = current context). No hook reads it today.
- Pins: `skill-wiring.test.ts:32-34` exactly 2 hook commands; `:36-42` scripts exist under `$CLAUDE_PLUGIN_ROOT`; `hook.test.ts:97-102`, `lessons.test.ts:71-74` silence for other tools.
- `execute.md:107` "You cannot measure your own token usage, so don't try"; stopping rule `execute.md:105-115`; compaction = stop signal `SKILL.md:78`.

### Spec-file writers
- `tools/spec.ts:14-36` flat switch; commands return a string; errors print `spec tools failed:`; **exit code always 0**. USAGE hand-kept at `spec.ts:12`. No shared flag parser (each command splits argv).
- Only writers today: `lessons/seen-in.ts:8-21` (regex line patch, avoids YAML re-emit) and `scripts/spec-bump.sh:66-67` (awk `updated:`; `--now` format only in bash, `:17-19`).
- `core/frontmatter.ts:10-30` parse-only via `Bun.YAML`; no stringify; `stringField` turns YAML dates into ISO strings.
- `core/progress.ts:20-28` `parsePhaseLines` uses the markdown AST: no line numbers, backticks stripped → a writer needs its own line locator. Keeps only `depth === 0` (`:18,23`): **indented sub-phase lines are dropped silently** (pinned by `tests/core.test.ts:31-43`); no warning. Downstream (graph, ready, doctor, status) inherits the drop.
- `core/phase-title.ts:8,17-20` `numericPart` reads `9.10` as 9.1 (affects ranges and `[phase N+]`).
- Deployed marker regex `progress.ts:10` (ticked line, after pointer).
- Rules a tick writer must respect already exist: `doctor/phases.ts:17-23` (box parity), `doctor/task-phases.ts:32-38` (evidence on task phases).
- Hand-edit instructions to rewire: ticking `execute.md:97,147-149`, `update.md:36-49,132,163-169`; lessons `SKILL.md:366-375,310`, spec-ledger writes `update.md:78`, `handoff.md:52`, `review.md:309,315`; promotion `update.md:171-185`. **No procedure exists for adding/splitting/renumbering phases** (`execute.md:150` defers to update, which has none).
- Renumber blast radius: progress lines, pointer filenames, `research/phase-<N>/`, sibling `needs`/`needs-deployed`/`same-files-as`, other specs' `spec#N` refs (`ready/refs.ts:15-31`), ledger `applies-to: [phase N…]` + INDEX tags.
- Project `_ledger/INDEX.md` is parsed by nothing (`doctor/project-ledger.ts:12-14` filters it out).
- Tests: `tests/fixtures/` empty; `tests/factories.ts` in-memory only; temp trees built ad hoc per file (`graph.test.ts:16-26`, `lessons.test.ts:37-39`, …). No shared spec-tree builder.

### Git / PR / settings
- **No git/gh/spawn in production tools.** Only tests spawn shells. All git steps are prose.
- Draft rule hard-coded in four places: `execute.md:137`, `SKILL.md:401`, `create.md:241-242`.
- `handoff.md:115-143` commits spec + code on the current branch, **no push**; `update.md:163-169` §9 reuses it; `review.md:335` "do not push unless the project's conventions say otherwise" (points at no config).
- **No project-settings notion.** Candidates: `_playbook/*.md` frontmatter (`playbook/playbooks.ts:24-30` drops files without `match:` silently; bodies injected as prose, clipped 4000 chars `playbook/render.ts:4-8`); `gates.md` (named checklists, `playbook/gates.ts:5-28`, no frontmatter parse). Taxonomy parser `core/taxonomy.ts` lists values only.
- **Nothing scaffolds or checks repo-level files** (`.gitattributes`). Project-level doctor checks run only when doctor has no spec name (`commands/doctor.ts:26`); handoff and the pack call `doctor <name>`, so the loop never sees project warnings. Issue model `doctor/issue.ts:3-23` reusable. Pack clips doctor to 6 lines (`context.ts:22`); `hook.test.ts:33` asserts exact doctor output.
- Handoff/update get no pack (`context.ts:34`), so settings there need an explicit `spec.ts` call.
- Worktrees: prose only (`SKILL.md:74,80,132`). Spec discovery is cwd-relative; docs-on-main would need a second checkout or a plumbing commit.

## Reuse
- `findSpecs`/`listSpecs`/`locateSpecFile`, `phaseForHint`, `samePhase` for the parse fix.
- `lesson-recall.ts` session-memory pattern for a one-shot nudge.
- `seen-in.ts` line-patch approach for all writers (no YAML re-emit).
- Doctor `Issue`/`formatIssues`, `parseGates` + `spec.ts gates`, tag playbooks (`match:`), `Bun.YAML` frontmatter helpers.
- **CRM prior art** (`~/IdeaProjects/crm`):
  - Docs to main: `docs/specs/_ledger/workaround-push-spec-docs-to-main-from-a-worktree.md` — temp index + `commit-tree` onto `origin/main`; add files not shared folders (once deleted 8 lessons, restored `4dcfd025a9`); hand-merge INDEX rows; check `git diff --cached --stat` for deletions. Needed because `~/.claude/hooks/pre-tool-use/bash/bash-guard.ts:58-69` rewrites main-repo paths to the worktree and `file-guard.ts:35-45` blocks main-repo writes.
  - CI skips drafts: `.github/workflows/ci.yml:68` (`draft == false`), `e2e-fargate.yml:87`. Conflicting PR runs no workflows (`_ledger/gotcha-conflicting-pr-runs-no-workflows.md`). No actionlint config.
  - Merge from worktree: `gh api -X PUT repos/CRM-Dance/crm/pulls/<N>/merge` (memory `reference_gh_pr_merge_fails_in_worktree.md`).
  - After merging main: Modulith export (`gotcha-modulith-metadata-goes-stale-on-a-clean-merge.md`) **but revert order-only churn** (`gotcha-modulith-export-order-churn.md`); route lock twice after `api:regen` (`gotcha-operation-route-lock-only-sees-regenerated-specs.md`); typecheck every touched subproject (`gotcha-merge-keeps-a-field-both-sides-added.md`); `api:regen` already builds TS packages (`ops/src/api-regen.ts:300,345`); scripts `package.json:25,27,28,40`.
  - Gates: CRM has no `_playbook/gates.md`; per-target commands in `.claude/rules/backend-verification.md:12-16`, `api-pipeline.md:44-50`, landing color-baseline gotcha, studio-config gotcha. CI filter names `ci.yml:70-80` are a ready target set.
  - Page/SEO: `_playbook/growth.md:37-43` already describes the `/seo` brief → `page-design` showcase order; `.claude/skills/seo/references/search-intent-brief.md` exists.
  - Worktrees: `~/.claude/hooks/worktree/create.ts` copies `.claude/` + env, installs `ops/` only (`:118-139`), branch `worktree-<name>` from local HEAD; ports already solved by `pnpm dev:all --auto-port` (`.claude/rules/dev-all.md`); `pnpm bootstrap` prompts unless `--no-prompt`.
  - No `.gitattributes`; 174 tracked `INDEX.md` files.

## Contradictions (for create's Decide stage — not resolved here)
1. Draft vs ready: plugin says draft (4 places); `crm/.claude/rules/git-workflow.md:29-30` says non-draft unless parked; memory `feedback_pr_ready_is_antons_call.md:12` says `gh pr ready` only on Anton's word.
2. Watching CI: `git-workflow.md:35-36` says watch; memory `feedback_no_babysitting_ci_deploy_verification.md:23` overrides. Affects whether `pr-status` is on-demand or auto-watched.
3. Merge method: squash (`reference_gh_pr_merge_fails_in_worktree.md:24`) vs merge (`feedback_merge_decisions_are_antons.md:15`); merging is Anton's call.
4. Spec docs: memory `feedback_specs_go_to_main.md` vs `git-workflow.md:5-7` (docs ride the PR) vs plugin handoff (commits on branch).
5. Worktree branches: hook names `worktree-<name>` from local HEAD; memory wants spec-named branches from `origin/main`.

## Risks
- CRM ledger `gotcha-generated-path-guard-refuses-git-add.md` may be stale (`ops/src/hooks/pre-tool-use/protect-generated.ts:46-52` only blocks write-looking commands).
- Hook gotchas: returning allow auto-approves (`gotcha-hook-allow-auto-approves.md`); hooks importing packages fail open without install.
- Any new `!` injection must avoid `&&`/`||` around here-docs (worktree isolation).
- Changing doctor output breaks exact-output tests.

## Neighbors
No `docs/specs/` existed in the plugin repo before this spec; `graph files` has nothing to compare. Relation to CRM specs: none declared (plugin is domain-free; CRM adoption is project config).

## Still open
1. Which hook events skill frontmatter supports (UserPromptSubmit/Stop?), whether `if:` filters work there, and what a hook can know about the context-window size.
2. `gh` JSON shapes for a one-shot PR status (mergeable/mergeStateStatus/isDraft/statusCheckRollup), failed-job log tails, and "same job on main's latest run" — verified against CRM, read-only.
3. Whether the temp-index docs-to-main recipe works from inside a worktree under the bash guard, and how `merge=union` behaves on INDEX rows (duplicates, ordering).
