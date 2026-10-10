---
date: 2026-10-10
wave: 1
lens: implementation
slug: pr-moment-ci-reality
brief: product-brief.md
---

# Recon Wave 1 — pr-moment-ci-reality

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Four agents: plugin seam, CRM CI reality, GitHub + Claude Code waiting primitives, PR episodes in 70 CRM transcripts (2026-10-07 → 10-10). Plus direct checks of CRM memory files and PR head commits.

## Verified

### The plugin seam (spec-driven)
- PR gate is prose only: `skills/spec/execute.md:150-167` (§10). `:157` opens a draft unless `pr.draft: false`; `:159` pr-status "never waits"; `:163` "Merging the PR is the user's call; never merge on your own", worktree merge via `gh api -X PUT repos/{o}/{r}/pulls/<n>/merge -f merge_method=…` (`gh pr merge` fails in a worktree). `SKILL.md:98` (Remote), `:431-438` (pr-opening semantics, "a draft unless…"), `handoff.md:144-154` (push/publish-docs, claim release), `update.md:49` ("never infer a deploy from a merge"), `create.md:226-252` (pr-opening template: Spec state has no merged field).
- `pr-status` is the reusable core: `tools/commands/pr-status.ts:10-20` (sync, injectable `Runner`, returns rendered text only). `pr/resolve.ts:14-44` (PR from number, branch, or spec's Spec state `PR #n`//pull/n`), `pr/gh.ts:17` 30-call budget per client, `PR_FIELDS` (`:18`) lacks `headRefName`/`baseRefName`/`url`, `pr/report.ts:25,33-50` (`PrReport`, UNKNOWN mergeable re-poll, 3 tails), `pr/checks.ts:9,13-31` (states merged|closed|conflicting|draft|red|pending|green|unknown; **cancelled is ignored**; external globs excluded from counts; no "required" notion), `pr/main-compare.ts:11-26` (last 15 main runs of the same workflow: "main fails too" — but no "already fixed on main"), `pr/log-tail.ts:10-19`.
- No code anywhere waits, reruns, marks ready, merges, or records a merge. The words rerun/ready/required/flaky do not appear in tools/.
- Settings: `tools/playbook/settings.ts:14-30,50-75` — `pr.draft` (default true), `pr.merge` (squash|merge|rebase, default unset), `checks.external` globs. New key = one `SECTION_KEYS` row + parse line + describe entry; pack line `commands/context.ts:101`, doctor `doctor/settings.ts:16-19`; pinned by `settings.test.ts:80`, `context.test.ts:145-149`.
- Board: `board/joins.ts:46-52,72-76` counts `fail + cancel` as failing and needs ≥1 pass for `merge` — **disagrees with pr-status's green**. `board/attention.ts:22-36` → `fix`/`merge` needs-you rows; `board/render.ts:89`. PR data via async `pr/gh-lists.ts`, `pr/rollup.ts`.
- Launch: `launch/command-line.ts:17-29` accepts only `SUB_COMMANDS` (`context/request.ts:9`); a phase only with `execute`. Claims are per phase (`claims/store.ts:38,108`) and turn `done` once the phase is ticked on base (`claims/rules.ts:35-41`) — a phase claim cannot represent "babysitting PR #n".
- Recording a merge: nothing automatic. Agents hand-edit Spec state; `resolve.ts:14` depends on the `PR #n` / `/pull/n` forms.
- Test helpers to reuse: `tests/stub-runner.ts` (`stubRunner`, `asyncStubRunner`, `cannedGh`), `tests/pr-status.test.ts:7-60` (`view()` builder, `createTree()`), fixtures `tests/fixtures/gh-pr-checks*.json`, `gh-run-*.json`, `gh-job-log.txt`, `gh-pr-list-*.json`; `tests/factories.ts`, `tests/board-factories.ts` (`prRow`).
- The plugin's own repo: one workflow (`.github/workflows/*`: version-consistency + spec-tools = bun test + typecheck), no branch protection, `allow_auto_merge: false`, squash used. A cheap live test bed.

### CRM CI reality (`~/IdeaProjects/crm`, `CRM-Dance/crm`)
- Branch protection on main: **no required status checks, no required reviews**; rulesets `[]`; `allow_auto_merge: false`; no merge queue; `delete_branch_on_merge: false`. House method = **merge commit** (#919, 918, 916, 915, 909, 904).
- **Merge = deploy**: push to main deploys the staff app through CodePipeline without waiting for CI (`docs/specs/_ledger/gotcha-frontend-deploy-does-not-wait-for-ci.md`).
- `ci.yml` (Monorepo CI): triggers opened/synchronize/reopened/ready_for_review (`:16-22`), workflow-level `paths:` (`:26-56`), draft skip only on the `prepare` job (`:67-73`) so every job skips on drafts, ~20 path-filtered jobs, `concurrency: ci-<pr>` + `cancel-in-progress` (`:62-64`) → a push cancels the older run. `e2e.yml`: draft skip on the job (`:87`), 30 min, cancel-in-progress, retries 0 (`frontend/playwright.config.ts:21-23`). Baselines `ops/src/ci-timing-summary.ts:24-41` (backend 676 s, E2E 385–612 s); #919 went green 14 min after ready.
- Vercel: ~10 `Vercel – <project>` statuses + "Vercel Preview Comments" per PR. 9 client sites finish instantly (skip unaffected); **crm-dance-landing ~25 min after CI green**. No `ignoreCommand`, and adding one is forbidden (`websites/CLAUDE.md:109-111`). In `statusCheckRollup` they are StatusContexts with no `workflowName`.
- CRM settings `docs/specs/_playbook/settings.md:1-7`: only `docs: main` + gates (bootstrap, after-merge-main, per-commit); **no `pr.*` or `checks.external`**. `gates.md` has `pre-pr` ("before the PR opens or leaves draft").
- Rules that conflict with the brief: `.claude/rules/git-workflow.md:3-4` "Never merge to main… merging is a human decision"; `.claude/rules/e2e-debugging.md:78` "A flaky test is never accepted as flaky". Also `git-workflow.md:23-34`: never `git push` then `gh pr ready` back-to-back (the push's run sees the draft, skips, and cancels the real run; recovery = a new commit, not rerun; seen on #719 and still on open #921 at 19:32). `:37-41` "runner lost communication" → rerun the job.
- Triage tools: `ops/package.json:30-37` `e2e:debug --pr N`, `e2e:log-summary --run`, `e2e:artifacts`, `e2e:trace`, `ci:timing-summary --run-id`; skill `.claude/skills/debug-e2e-ci`. Missing: non-E2E triage, "already fixed on main", known-flake list (none exists).
- Project lessons that apply: `gotcha-conflicting-pr-runs-no-workflows` (conflict → zero runs, "no checks reported"), `gotcha-ci-filter-path-outside-pr-paths-never-runs` (zero checks can be correct), `gotcha-concurrency-group-keeps-one-pending-run`, `gotcha-spot-reclaim-kills-ci-jobs-with-no-recovery`, `workaround-read-a-failed-job-log-while-the-run-is-still-going` (use `gh api …/actions/jobs/<id>/logs`), `gotcha-stripe-sandbox-objects-are-shared-by-concurrent-ci-runs`, `gotcha-frontend-deploy-does-not-wait-for-ci`.
- **Head commit with zero checks**: #916 and #909 merged with heads `Merge commit '<snapshot>' into feat/…` after `docs(spec): snapshot …` — publish-docs' merge-back, docs-only, outside `ci.yml`'s paths, so no workflow ran on the head. #918 (backend files) also shows "no checks reported". "All green on head" is vacuous on such heads.

### Anton's standing rules (CRM project memory, `~/.claude/projects/-Users-antonhaskevych-IdeaProjects-crm/memory/`)
- `feedback_no_babysitting_ci_deploy_verification.md` (2026-08-23): after push, don't watch CI; "overrides the 'after pushing, watch CI' line… unless he explicitly asks to watch". → babysit is that explicit ask; this memory must be superseded when the spec ships.
- `feedback_pr_ready_is_antons_call.md` (2026-09-18): `gh pr ready` only on an explicit instruction in the current conversation; reason: UI pass before reviewers, non-draft burns CI on every push.
- `feedback_merge_decisions_are_antons.md`: Anton may merge a draft with zero CI; **"Just merge it" means merge now** via `gh api -X PUT … -f merge_method=merge`, without watching CI; state the risk once; flag what goes live.
- `feedback_minimize_pr_count_ci_cost.md`: every push on a non-draft PR costs a full CI matrix; one PR by default.
- `feedback_finish_phase_including_deploys.md`: after a merge, fetch main before branching.

### GitHub + Claude Code primitives (sources in the deep-research output; docs cached in the session scratchpad)
- **Async merge API** (GA 2026-10-01): `PUT /repos/{o}/{r}/pulls/{n}/merge-async` with `sha`, `merge_action` (default|direct_merge|merge_queue), `merge_method`; 202 → poll `GET …/merge-async/{uuid}` → `pending|merged|enqueued|failed` (kept 24 h). "Branch protection rules and repository rules are not run at this stage" — whether it waits on pending checks is **unverified**; treat as merge-now. No `gh` subcommand (≤2.102.0): `gh api -X PUT … -H 'X-GitHub-Api-Version: 2026-03-10'` (header inferred). `sha` pins the head: a late push cancels the merge.
- **Native auto-merge** needs `allow_auto_merge` (off on both repos); per gh source `isImmediatelyMergeable` (CLEAN/HAS_HOOKS/UNSTABLE), so with **no required checks `gh pr merge --auto` merges immediately**. Unusable for CRM as configured.
- **Waiting**: `gh pr checks <n> --watch --fail-fast -i 30` (exit 0 none failed+none pending, 1 failed; 8 = pending without --watch). Buckets: SKIPPED/NEUTRAL = skipping, CANCELLED = cancel (not failure — all-cancelled exits 0), STALE/EXPECTED = pending. Vercel StatusContexts are watched too (ERROR = fail). Right after a push: "no checks reported" exit 1 → confirm head SHA first, retry. `--required` errors when nothing is required. `gh run watch --exit-status` covers one run only.
- **Rerun**: `gh run rerun <id> --failed`, `--job <databaseId>`; 50 reruns/run, 30 days. External statuses can't be rerun.
- **Claude Code**: background Bash (`run_in_background`) notifies once on exit, no time cap interactively (30 min/2 h unattended); Monitor max 30 min, one event per line; `/loop`+ScheduleWakeup only while the session runs; Routines (cloud) have GitHub triggers for PR/release events only, not check runs. None survive closing the session except Cron/Routines. Built-ins: Desktop "Auto-merge when ready" (needs repo auto-merge), web `/autofix-pr` (needs Claude GitHub App).
- **Prior art**: OpenHands `/iterate`: branch-caused (compile/lint/type, deterministic tests in touched code) → fix; infra/network/runner/untouched-code → `gh run rerun --failed`; **max 3 reruns per SHA**, then real; stop only on green+mergeable, merged/closed, budget out, human needed. Cursor `loop-on-ci`: triage existing failures first, then `gh pr checks --watch --fail-fast`, re-check the full set after each push.

### What actually happened in 70 sessions (13 PR episodes)
- Failures (13): **ours 6** (breaking-change lock ×2, `pnpm -C ops test:hooks` missed ×2, meaning clash with main, lint OOM on CI's ~2 GB heap); **pre-existing test bug fixed in the PR 4**; **already fixed on main 1** (#912, branch 208 behind); **external flake 1** (Stripe sandbox, main nightly); **merge conflict 1**. Non-blocking: Vercel pending ×2; 8 PRs opened as drafts so CI never ran until un-draft.
- Triage that worked, in order: `pr-status <n>` → find the failing run for the **current head** (`gh run list --branch … --json databaseId,headSha,conclusion`; stale-head failures misled twice) → E2E: `debug-e2e-ci --pr N` / `e2e:debug` → `e2e:log-summary` → `e2e:artifacts` (fallback `gh run download -n e2e-results`) → `jq` over results to split real failures from cancelled-by-stop → cross-run collision check (`gh run list --workflow e2e.yml` same window) → already-on-main check (`git merge-base --is-ancestor <fix> HEAD`, `git log origin/main -- <path>`) → non-E2E: job log via API, reproduce locally → verify flake fix with `gh workflow run e2e.yml -f test_filter=… -f extra_args=--repeat-each=N`.
- Waiting misfires: bare `sleep` blocked; a 2-min CronCreate polled ~20 times over 2 h on a non-required Vercel check; Monitor expiry; **pushes during CI restarted it** (publish-docs' main merge caused #915's second failure); three episodes ended "pushed, haven't waited"; one session abandoned an unpushed main merge; `pr-status` once said "merged" for an open PR with pending checks (spec-driven #21).
- Anton intervened ~25 times: pasted failing checks 10×, asked state 4×, merged himself 7×, authorised agent merge 3×. Every agent merge used `gh api -X PUT … -f merge_method=<house> -f sha=<head>` after matching earlier PRs' merge style.

## Reuse
- `pr-status` report (state, failures, log tails, main-compare) as the triage input — extend, don't fork.
- Settings machinery for any new keys (`pr.*`, required/ignored checks) — one row each.
- `push` for pushes; publish-docs' snapshot logic is the thing to keep *off* a babysat PR's branch.
- CRM's `e2e:*` scripts and `debug-e2e-ci` skill as the project-side triage, named from a CRM playbook, not the plugin.
- `gh pr checks --watch --fail-fast` in one background Bash call as the wait primitive (one notification, no turn burn).
- Stub runner + gh fixtures for tests; the plugin repo itself for a live check.

## Still open
- **Which checks "matter"** when the repo requires none: a project setting (required names / ignored globs like `Vercel – *`) vs. GitHub's required list when present.
- **Async merge vs plain PUT merge**: does async merge wait, fail or merge on pending checks? Verify live on the plugin repo before relying on it.
- **Where the babysitter lives**: the execute session after its PR gate (background wait, one notification) vs. a launched dedicated session vs. a cloud routine — and what holds it (phase claims can't).
- **Docs pushes vs CI**: publish-docs merges main into the PR branch and pushes, restarting CI or leaving a docs-only head with zero checks. Babysit must pause docs publishing or judge green on the last code-bearing commit.
- **Policy changes**: plugin `execute.md:163`, CRM `git-workflow.md:3-4`, `e2e-debugging.md:78`, and 3 CRM memories encode "never merge / never ready / no babysitting". The one question replaces them per PR; which text moves, and the "merge now, skip CI" option Anton already uses.

## Neighbors
- `spec-loop-automation` (open, phase 10 CRM adoption): built pr-status, push, publish-docs, settings — **related**; this spec extends its tools.
- `spec-board` (done): board PR cells and needs-you `merge`/`fix` rows — **related**; green must match.
- `self-driving-loop` (prep): chains sessions and owns sync-with-main; **related**, already declared.
