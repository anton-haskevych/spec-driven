---
date: 2026-10-07
wave: 1
lens: implementation
slug: board-sessions-storage
brief: product-brief.md
---

# Recon Wave 1 — board-sessions-storage

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

`T` = `skills/spec/tools`.

## Verified

### Board pipeline
- Entry: `T/commands/list.ts:18-24` (bare `list` → board, always `local:false` at :21; any arg → `portfolioTable`), `T/commands/board.ts:20-47` (`board [lane] [--json] [--local]`, `strict` args, lane words from `LANES`).
- IO layer is only `T/board/load.ts:42-76` (`loadBoardInputs`). Base = `origin/<default>` via `mainline/load.ts:30-75` (git-archive cache, `READ_SET` at `T/mainline/base-cache.ts:6` covers `docs/specs/*/*.md`, so a flat `docs/specs/_<dir>/*.md` is already read; subfolders are not).
- `buildBoard` is pure: `T/board/lanes.ts:37-61`. Ready rank `T/board/rank.ts:9-18`. Model `T/board/model.ts` (`BOARD_VERSION = 1` :4, lanes :85, footer :86-95). Render `T/board/render.ts:18-28` (header, LANES in order, footer; caps READY 8 / BLOCKED 5). Cells `T/board/cells.ts`.
- No spec-level row exists anywhere on the board. Every row is spec+phase.
- Per-spec pieces to reuse: progress x/y `T/portfolio/rows.ts:37`; next ready / waiting reasons `T/ready/ready-set.ts:16,47` (via `lanes.ts:74-86`); stage blockers `lanes.ts:110`; deploy waits `T/board/attention.ts:64-76` (keyed by the undeployed phase, must be inverted to the waiting spec); flight rows with holder/session/pr `T/board/flight.ts`, `T/board/joins.ts`.
- `SpecMeta` (`T/core/spec-meta.ts:4-11`): area, domain, scope, updated, priority, due. No owner, no focus. `PRIORITIES = p1..p3` (`T/core/schedule.ts:3`).
- `owner:` is documented as an ad-hoc field only (`README.md:32`, `SKILL.md:349`, `idea.md:23`); no code reads it; CRM has none.

### Sessions
- `~/.claude/sessions/<pid>.json` real fields: pid, sessionId, cwd, startedAt, procStart, version, kind, entrypoint, name, **nameSource** (`user` for `claude -n`, `derived` for `<repo>-<2hex>`), nameSince, status (busy|idle|shell), updatedAt (= statusUpdatedAt, last status change).
- `T/sessions/live.ts:12-21` keeps only pid, sessionId, cwd, status, name, updatedAt, procStart. Liveness = pid + procStart match (`:53-54`). Unknown status → busy (`:95-97`).
- Launch names sessions `<spec> <sub> [<phase>]` (`T/launch/command-line.ts:25-28`), checked against kebab case, `SUB_COMMANDS` (`T/context/request.ts:9`) and `PHASE_ID` (`:12`). Hand-started sessions have derived names with no spec. A user can also type free text with `-n`, so `nameSource:"user"` alone doesn't prove the grammar: the first token must match a known spec.
- Session → row join today (`T/board/joins.ts:13-27`): claim sessionId first, else newest session whose cwd is in the row's worktree (`T/workspaces/owner.ts:4-7`). **One session per row; siblings dropped** (fast-parallel-backend-tests-pr-c1 holds execute 8, 9, 10). **A session alone never creates a row** (`T/board/flight.ts:19-23`).
- Tree-level session helpers exist in `T/trees/find.ts`: `sessionsIn` (87-90), `sessionLabel` (92-94), `treeHolder` (51-61).
- Plain sessions (crm-d1, crm-ac…) have cwd = main checkout; `EnterWorktree` sessions keep main's path. Transcripts record per-message cwd/gitBranch but are large and undocumented; nothing reads them.

### "execute 6caaa" and the 3-day tab
- 6caaa took its claim and released it at handoff (transcript shows both). Open-without-claim after handoff is the designed controller-tab pattern (`decision-tree-held-by-work`, `decision-controller-tab-checks-claims-no-hook`).
- "recurring-series-lifecycle-clarity execute 7" (pid 369) is idle since 2026-10-04 and holds claim `#7` (claimedAt 2026-10-04T03:30). `claimStatus` says `live` (`T/claims/rules.ts:34-40`); **no attention row fires for a live-but-long-idle claim** (`T/board/attention.ts:34-48` covers only closed local claims and remote claims older than `REMOTE_CLAIM_STALE_DAYS = 3`).

### Teammate visibility
- Remote claim refs `refs/spec-claims/<spec>/<phase>` carry the full claim + `holder {user, host}` (`T/claims/remote-payload.ts:7-32`). `user` = git author name (`T/claims/remote.ts:21-25`). No heartbeat; only `claimedAt`.
- Live now: Taras Korpach@fedora holds gift-cards 1, 2, 3, 4a (one session, no sessionName).
- Teammate work without a claim is invisible: worktree scan is local only; origin branches are never read.
- Teammate branches use `spec/<spec>` and in-repo `.claude/worktrees/`; Anton uses `feat/<spec>-pr-<g>` (`T/trees/naming.ts`). **ROADMAP "Rules for every release": no branch-to-spec mapping.** So branch names are not a spec key.
- PRs: `T/pr/gh-lists.ts:7-8` fetches number, headRefName, isDraft, url, statusCheckRollup (+ state, mergedAt for recent). **No `author`.** PR → spec today via `pr-opening.md` links (`specPrNumbers`, `board/load.ts` `prLinks`).
- Identity: no "me" in the code beyond `ownSessionId` (`T/board/inputs.ts:44`). Local claims carry no user. git author name ≠ gh login for the teammate ("Taras Korpach" vs `taraskorpach`).

### Storage of a team-shared focus set
- **Per-spec frontmatter**: auto-loaded into `SpecNode.meta`; cheap to add. But a ranking spread over N specs means reorders edit N `CLAUDE.md`s, those files take `updated:` bumps from every session on that spec, and branch edits to existing specs' meta are invisible to the board (`T/workspaces/views.ts:10-24` overlays only `SpecState`).
- **One file** (`_playbook/settings.md`, parsed by `T/playbook/settings.ts:33-61`, key whitelist): a list every developer edits on branches is exactly the shared-append file the project retired (`spec-loop-automation/ledger/gotcha-github-ignores-merge-union.md`; `SKILL.md:399`).
- **Per-entry folder** `docs/specs/_<dir>/<spec>.md`: in `READ_SET`; `_` dirs are skipped as specs (`T/core/spec-folders.ts:20,28,58`); loader exemplar `T/backlog/items.ts:21-47`; validation hook point `T/hooks/spec-file-check.ts:27-31` + a doctor project check (`T/commands/doctor.ts:30`). A global order then needs a sortable key per file. Must not live under `_playbook/` (every file there is treated as a playbook and silently ignored without `match:`).
- Publishing: `publish-docs` carries any `docs/specs/**` path to main. CRM lesson `workaround-push-spec-docs-to-main-from-a-worktree`: add files, never push a whole `_` folder (it deleted other sessions' files).

### Consumers of the board
- Code: `commands/board.ts`, `commands/list.ts`; `commands/claim.ts`, `trees/place.ts` use `loadBoardInputs` only. Hooks and context packs never read the board; `commands/context.ts:28` mentions it in prose.
- Prose: `SKILL.md:151-164` (*Next sessions*, also the "what's next" answer), `handoff.md:174`, `review.md:350`, `create.md:376`, `execute.md:22`, `list.md:9-25`, `README.md:20,114,117`.
- Additive fields keep `BOARD_VERSION` 1 (precedent `spec-board/ledger/decision-remote-claims-landing-shape.md:20`). `tests/board-command.test.ts:35` pins the literal 1. `list --json` is a separate shape and must not carry board data (`decision-board-command-surface.md`).

### Bug
- `spec.ts list table --local` / `list --local` print "No open specs": unknown flags become the table filter (`T/commands/list.ts:20,28` → `T/portfolio/order.ts:19-22` → `T/portfolio/render.ts:20-21`). `list` has no `--local` path though `list.md:21` implies one. Untested (`tests/portfolio.test.ts:107-140`).
- `list` words route to the table filter (`list.md:11`); `matchesSpec` is a name substring, so `list <person>` silently filters the table. `idea.md:9` and `prep.md:291` pass free words to `list` for dedupe, so new keywords there would collide.

## Reuse
- Board sections and helpers: `renderBoard`, `lane()`, `capped()`, `alignColumns`, `rowName`, `sessionCell`, `ago`.
- Per-spec state: `readySet`, flight rows, `needsYou` deploy rows, `portfolio/rows.ts` progress.
- Sessions: `loadLiveSessions` (extend with optional `nameSource`, `startedAt`), `ownerOf`, `sessionsIn`/`sessionLabel`/`treeHolder`, `isPhaseId`, `SUB_COMMANDS`.
- Claims: `claimStatus`, `heldClaims`, `remoteHeldClaims`, `readHolder`, `REMOTE_CLAIM_STALE_DAYS` and the `remote-claim` attention row.
- Storage: `backlog/items.ts` loader shape, `readSchedule`, `spec-file-check` + doctor project-check wiring.
- PRs: `prLinks` (spec → PR numbers), `gh-lists` (add `author`).
- Tests: `tests/board-factories.ts` (`specFixture`, `boardInputs`, `flightRow`, `readyRow`, `board`), `tests/factories.ts`; render tests assert exact text.

## Still open (decisions, not unknowns — for `create`'s Decide stage)
- Focus storage: per-entry folder (name, e.g. `_focus/`) vs frontmatter; the rank key and how a reorder writes.
- Identity for owner and "mine": git author name, gh login, or both as aliases; where a person's aliases are declared without per-person config in the plugin.
- Session → spec attribution order: claim sessionId → cwd in a worktree whose spec diff names the spec → session name whose first token is a known spec. Sessions that match none: one "unattributed" line or dropped.
- "Looks abandoned" rule: live claim + session idle ≥ N days (reuse `REMOTE_CLAIM_STALE_DAYS`?).
- Teammate work: remote claims (exists) + open PRs by author joined through `prLinks`; anything beyond that is out (no branch mapping).
- Filter words on `list` (mine / a name) vs the table filter and the dedupe callers; fix `--local` handling in the same change.
- Where shipped focus entries go: auto-hidden when the spec is finished, or removed at handoff.

## Neighbors
- `spec-board` (finished): owns `board/model.ts`, `board/lanes.ts`, `sessions/live.ts`, `pr/gh-lists.ts`. Relation: `related` (this spec extends its board; already declared in `CLAUDE.md`). No `needs`: it is done.
- `spec-loop-automation` (active, 1 phase open): owns the ready set and packs; no overlap with the touched files reported by `graph files`.
