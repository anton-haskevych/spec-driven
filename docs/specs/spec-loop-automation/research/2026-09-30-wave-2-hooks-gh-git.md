---
date: 2026-09-30
wave: 2
lens: implementation
slug: hooks-gh-git
brief: product-brief.md
---

# Recon Wave 2 — hooks-gh-git

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Aimed at wave 1's three open items. Two agents (Claude Code docs; read-only gh + throwaway-repo git probes) plus a direct docs read. Git 2.54.0. Probe repos: `scratchpad/union2`, `union3`, `publish` (session scratchpad, not kept).

## Verified

### Hooks (code.claude.com/docs/en/hooks — "Hooks in skills and agents")
- Skill frontmatter hooks register when the skill is invoked and **keep running for the rest of the session**. Agent frontmatter `Stop` is converted to `SubagentStop`; the section implies the full event set is allowed in frontmatter (not listed explicitly — confirm `UserPromptSubmit` with one probe before relying on it).
- `once: true` removes a hook after its first successful run; **honored only in skill frontmatter**. A failing/blocked/timed-out run keeps it.
- `PostToolUse` and `UserPromptSubmit` can return `additionalContext` that the model sees. `PostToolUse` receives `tool_input.command` for Bash plus `tool_response`.
- `if:` uses permission-rule syntax (`"Bash(git *)"`) as a pre-spawn filter (`~/.claude/hooks/REFERENCE.md` §3).
- **No context-window or model field in any hook payload.** Context size must come from `transcript_path` usage lines (wave 1); the window size is not given, so a threshold must be absolute tokens or read from the transcript's model id.
- Plugin `hooks/hooks.json` is active whenever the plugin is enabled (every session) — wrong scope for /spec-only behaviour; skill frontmatter is the right home.

### PR status via gh (CRM-Dance/crm, read-only)
- `gh pr view N --json isDraft,mergeable,mergeStateStatus,headRefOid,statusCheckRollup`. Rollup mixes `CheckRun` (Actions: `name,status,conclusion,workflowName,detailsUrl` — run/job ids only by parsing `detailsUrl`) and `StatusContext` (Vercel: `context,state,targetUrl`). Normalise `.name // .context`, `.conclusion // .state`.
- `gh pr checks N --json name,state,bucket,workflow,link` normalises into `bucket` (pass/fail/pending/skipping/cancel); no `isRequired`; **exits 1 when any check fails**.
- `mergeable` is often `UNKNOWN` (computed lazily, also on open PRs) → one re-poll needed. Failing Vercel statuses give `UNSTABLE`, not `BLOCKED`. CRM has **no required checks** (branch protection 404, rulesets `[]`).
- Drafts: every Actions job SKIPPED (#872) or no Actions checks at all (#869). Path filters also leave many SKIPPED on ready PRs (15/29 on #871).
- Failed jobs: `gh run view <run> --json jobs` → jobs with `steps[].conclusion=="failure"`. Logs: `gh run view --job <job> --log-failed` (~1 s; whole-run variant ~5 s / 1.1 MB). Line format `job\tstep\t<ISO> text`, BOM on line 1, ANSI codes, untimestamped multi-line output. Useful signal is the **tail** (vitest diff → `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` → `##[error]Process completed…`); grepping "error|fail" is noisy.
- Main comparison: `gh run list --branch main --workflow ci.yml --json databaseId,conclusion,status,headSha,createdAt` then `gh run view <id> --json jobs`. Filter by workflow **file**, not display name (a name query once returned stale runs). On CRM main the wanted job is usually `skipped` (push-to-main triggers `ci.yml` only for a few paths, `ci.yml:3-12`) or the run was `cancelled` → must walk back to the last run where the job actually ran, and report its date.
- Latency ~0.8–1.3 s per call; 5000/hr core + GraphQL.

### merge=union on INDEX.md
- `docs/specs/**/INDEX.md merge=union` matches spec INDEX files and `_ledger/INDEX.md` (also `index.md` on case-insensitive macOS), not a root INDEX. Applies to merge, rebase, cherry-pick, `merge-tree --write-tree`.
- Correct: different appends (ours then theirs); identical appended row kept once; edit of a non-final row; delete of a non-final row.
- **Silent bad merges (exit 0, no markers):** same rows appended in different order → duplicates; editing the last row while the other side appends → stale + new both kept; both sides editing one row → both kept; deleting the last row while the other side appends → deletion lost.
- The attribute comes from the merging side's tree: a branch cut before `.gitattributes` still conflicts when main is merged into it. GitHub server-side merge behaviour untested.
- Append-only files are fine; the doctor can catch the failure modes (duplicate rows, rows pointing at missing files).

### Publishing spec docs to main from a worktree
- CRM recipe (`crm/docs/specs/_ledger/workaround-push-spec-docs-to-main-from-a-worktree.md:10`): `git fetch origin main; IDX=$(mktemp); GIT_INDEX_FILE=$IDX git read-tree origin/main; GIT_INDEX_FILE=$IDX git add <files>; TREE=$(GIT_INDEX_FILE=$IDX git write-tree); C=$(git commit-tree $TREE -p origin/main -m …); git push origin "${C}:refs/heads/main"`.
- Reproduced in a bare-origin + worktree repo: origin/main got exactly the named files; worktree HEAD, branch, index and dirty state untouched; untracked files stay untracked.
- Pitfalls reproduced: unquoted `${C}:refs…` in zsh fails; adding a folder (`_ledger`) or the branch's copy of `INDEX.md` stages **deletions** of other sessions' rows/lessons; paths missing from the worktree fail (deletions can't be published this way); a concurrent push → `rejected (fetch first)` (safe; re-fetch and rebuild); worktrees share `refs/remotes/origin/main`; `commit-tree` skips pre-commit/commit-msg hooks (pre-push still runs).
- Implication: the file list must come from `git diff --name-only origin/main...HEAD -- docs/specs`, INDEX files must be merged as "main's rows + our new rows", and a no-deletions check must run before `commit-tree`. As a Bun command using `Bun.spawn` with argv arrays, zsh quoting stops mattering.

## Reuse
- The CRM recipe as the algorithm for a publish command (plugin-generic: nothing CRM-specific in it).
- `gh pr checks --json bucket` for grouping; `gh pr view --json` for draft/mergeable; `gh run view --job --log-failed` tail for triage.
- Skill-frontmatter hooks + `once: true` for a one-shot nudge.

## Still open
None blocking implementation. Design choices for create: where project settings live; git/gh runner shape and test stubbing; hook event for the nudge (PostToolUse vs UserPromptSubmit); how "main red too" reports when the job hasn't run recently.
