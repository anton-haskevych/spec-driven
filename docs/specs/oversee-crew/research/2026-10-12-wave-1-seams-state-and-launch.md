---
date: 2026-10-12
wave: 1
lens: implementation
slug: seams-state-and-launch
brief: product-brief.md
---

# Recon Wave 1 — seams, state and launch

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Four Explore agents: worker launch & identity; mode-file seams; board/gates/PR state;
storage/settings/prior art. `T/` = `skills/spec/tools/`.

## Verified

### Push (brief: "work is always on the remote")
- Today a branch first reaches origin at handoff §3 Commit (`handoff.md:145-152`) or
  update's *Close the phase* (`update.md:170-176`). `trees place` creates the branch
  locally only (`T/trees/place.ts:70-95`, `T/trees/acquire.ts:16-29`); `claim take`
  pushes only `refs/spec-claims/<spec>/<phase>` (`T/claims/remote.ts:56-58`) and on
  take-over reports the old branch `(not on origin)` (`T/commands/claim.ts:124-129`).
- Per-unit cycle commit step: `execute.md:116` (per-commit gate read at `:114`); babysit
  fix pushes `babysit.md:66-68`. No tool runs per-commit gates (`T/commands/gates.ts:31-37`).
- `spec.ts push` (`T/publish/push.ts:18-38`): fetches default branch every call, pushes
  `HEAD:refs/heads/<branch>` with `-u`, runs pre-push hooks, refuses detached HEAD and
  code on default branch; prints one `Remote:` line.
- Conflict: once a PR is ready, every push re-runs CI with cancel-in-progress
  (pr-babysit `decision-handoff-before-babysit-launch`, `domain-docs-only-head-gets-checks`);
  "no docs pushes while CI runs" (`babysit.md:83-84`, `execute.md:169`). Draft PRs run no
  CI (`execute.md:163`). `docs: main` projects see ticks on main only after
  `publish-docs` (2 pushes + merge-back commit each).

### Ship mode and the PR moment
- The one question: `execute.md:157-171` (babysit / draft / merge now; `:167` "the answer
  is the user's explicit instruction"); handoff re-ask `handoff.md:176-177`.
- Babysit merge step `babysit.md:91-107` — review mode stops before `pr merge` (`:93`).
  After merge: no deploy step, `phase deployed` only on user confirmation
  (`update.md:49`, `T/commands/phase.ts:21,58`).
- Prior decisions reversed on purpose: `pr-babysit/design.md:19` (no babysit-without-asking
  setting); self-driving-loop `design.md:101` lists opening/merging a PR as forks.
- Storage options: spec `CLAUDE.md` frontmatter (`T/core/spec-meta.ts:29-42`,
  validator `T/doctor/spec-meta.ts:8-27`, writable on main via the focus pattern;
  precedent `active-work-view/ledger/decision-focus-rank-in-spec-meta.md`);
  `pr-opening.md` is free prose that self-driving-loop phase 3 freezes; phase `pr:`
  groups have no group record and `trees place` reads them from base.

### Board / needs you / gates
- PR data: `OPEN_FIELDS` `T/pr/gh-lists.ts:7` (pinned `T/tests/pr-gh-lists.test.ts:17`),
  `PR_FIELDS` `T/pr/gh.ts:19`; no review field anywhere. Green ready PR →
  `nextFromChecks` `T/board/joins.ts:93-97` → `{kind:"merge"}` `T/board/attention.ts:31-36`
  → `#n checks pass → merge` `T/board/render.ts:90`. Babysat = live `pr-<group>` claim
  (`joins.ts:40,46-55`); a babysit `stopped` event is a per-machine log line never read by
  the board (`T/pr/babysit/log.ts:8,42`).
- Needs-you kinds `T/board/model.ts:76-86`: overdue, deploy, merge, fix, claim,
  remote-claim, idle-claim, prune. No review / question / parked kind.
- Phase frontmatter: `T/core/spec-state.ts:48-64` (`code`, `playbook`, edges via
  `T/core/phase-edges.ts:11-23`; a gate key must NOT join `EDGE_KEYS` — it flips
  `declared`). Validators `T/doctor/phase-edges.ts`, `T/doctor/task-phases.ts`; hook
  `T/hooks/spec-file-check.ts:63-73`; unknown keys pass silently.
- `phase tick` matches by `#N` or text prefix (`T/phases/locate.ts:19-39`); only refusal
  is task-phase evidence (`T/phases/tick.ts:50-55`) — how "approved by Anton" got ticked.
- Ready rows `T/board/model.ts:50-71`: no title, no task flag, no gate flag. Ranking
  `T/board/rank.ts:10-20`. `BOARD_VERSION=1` (`model.ts:7`) pinned in
  `board-command.test.ts:33-35`, `board-lanes.test.ts`, golden test.
- Park: nothing exists. A released claim with no ticks returns to READY; with ticks it
  stays in flight as "executing" (`T/board/activity.ts:35-39`). `in-flight.md` is read
  only by the resume pack (`T/context/packs.ts:92`). Only spec-level `status: paused`.

### Launch, identity, liveness
- Launch line `T/launch/command-line.ts:18-29`: `claude -n '<title>' '/spec-driven:spec
  <sub> <spec> [<target>]'`, positional only, rejects extra tokens; needs a spec name
  (an overseer with no spec doesn't fit). Title `T/launch/title.ts:12-21` is not unique
  and is parsed by `T/board/attribution.ts:33`, `T/board/focus.ts:146`.
- Terminal pick tmux → iTerm → Terminal.app (`T/launch/terminal.ts:6-22`); no close.
- Claude Code 2.1.296: `--session-id <uuid>`, `-n`, `--append-system-prompt <text>`
  (the `-file` form only appears inside `--bare` help — unverified),
  `--system-prompt-snapshot` default on (first prompt is reused on resume),
  `--permission-mode`, `--settings`, `--bg`, `attach|logs|stop|rm|respawn`,
  `claude agents --json [--all] [--cwd]` → `{pid,cwd,kind,startedAt,sessionId,name,status}`.
- Liveness `T/sessions/live.ts` reads `~/.claude/sessions/*.json` (undocumented) with a
  pid-reuse guard (`T/sessions/proc-starts.ts`); statuses busy|idle|shell, unknown = busy.
  Idle-since needs `updatedAt`, which `agents --json` lacks: complement, not replace.
- Claim ↔ session: claim stores `CLAUDE_CODE_SESSION_ID` (`T/sessions/own.ts:3-5`) and
  `sessionName` (`T/commands/claim.ts:144-155`). Handed-off vs stuck vs asking: not
  distinguishable in code (all = idle session; claim released or not).

### Storage
- Project settings `T/playbook/settings.ts:26-31` (one table row + one field per key;
  unknown keys warn only). Read from the working tree by `pr` commands, from the
  `origin/main` archive by the board (`T/mainline/load.ts:67-80`).
- Per-clone state: `stateDir` `T/core/git.ts:41-55` under `<common>/spec-board/`
  (claims, base cache, babysit logs); atomic helpers `T/claims/atomic-file.ts`.
  `local.md` (`T/trees/local-settings.ts`) holds one key and its writer rewrites the file.
- Commit to main without touching checkout: `landOnMain` `T/core/land-on-main.ts:23-49`
  (one file per commit; sanctioned only on the user's word —
  `active-work-view/ledger/decision-focus-writes-land-on-default-branch.md`).
- Cross-machine state without a committed file: claim refs with create-only lease
  (`T/claims/remote-payload.ts:19-23`).
- GitHub ignores `merge=union` (`gotcha-github-ignores-merge-union`): a shared append file
  (queue, run log) conflicts — one file per item or per writer.

### Sub-command wiring
- `SKILL.md:4,38,53-71` + `T/context/request.ts:9` `SUB_COMMANDS` (also used by launch and
  title parsing) + thin skill `skills/spec-<cmd>/SKILL.md` (template `spec-babysit`), pinned
  by `T/tests/skill-wiring.test.ts:84-113`. Its extractors match `[a-z]+` (`:87,:92`):
  `oversee-crew` fails them until the regexes accept a hyphen.

## Reuse
- `pushBranch` + `Remote:` line; `claim take/release` + claim refs; `pr open/wait/merge/log`
  and babysit §2; `phase deployed` + `deployWaits`; `parseSettings`; `readFocusFields` /
  `checkSpecMeta` pattern for a spec-level `ship:`; `stateDir` + atomic files for run state,
  reports and the question queue; `landOnMain` for main writes; `parseLaunchTitle`;
  `Runner` / `stubRunner` injection for tests.
- self-driving-loop phase 1's preflight *Defaults applied / Forks for you* split
  (`decision-preflight-defaults-vs-forks`) is the park trigger: a fork = park.

## Neighbors
- self-driving-loop: phase 1 (ready-row `title`, `next: review`, `BOARD_VERSION` bump,
  forks split) edits the same `T/board/model.ts|lanes.ts|render.ts` and `execute.md` §10
  — `needs: [self-driving-loop#1]` or absorb those deliverables. Phase 3
  (`in-flight/phase-<id>.md`, no shared writes) before several workers share one spec.
  Its brief put "launching with no pick" and "how many at once" out of scope — now ours.
- pr-babysit: `related`; review mode branches its §3; phase 8 (CRM adoption) open.
- spec-board / active-work-view: `related`; board stays read-only (active-work-view brief
  `:39-45`), so overseer actions live outside the board.
- BACKLOG.md L3 (auto-continuation) and D1 (autonomy level, `:56-61`): this spec answers
  both; close them at create.

## Gotchas (project ledger)
- `gotcha-execute-section-0-is-skipped-on-the-resume-path` — per-session steps (push at
  start, read the standing go) go in execute §1.
- `gotcha-session-files-span-every-repo` — scope any roster to this repo's worktrees.
- `gotcha-remote-claims-never-read-as-done` — handoff checks read the phase on base.
- `gotcha-trees-place-reads-pr-group-from-base`, `gotcha-squash-merged-branch-is-not-an-ancestor`,
  `gotcha-publish-docs-skips-deleted-files`, `gotcha-gh-api-error-body-is-valid-json`,
  `gotcha-iterm-scripting-writes-to-whatever-tab-is-in-front`,
  `gotcha-git-archive-fails-on-any-unmatched-pathspec`,
  `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`.

## Still open (aims Wave 2)
- `--bg` worker behaviour, probed live: does it keep the cwd we give (worktree isolation),
  does `CLAUDE_CODE_SESSION_ID` equal `--session-id`, does it write a session file, which
  status values appear, do plugin skills/hooks load, does `--append-system-prompt-file` exist.
- Does a plain branch push (no PR) run CI in CRM? Decides the cost of push-on-every-commit.
