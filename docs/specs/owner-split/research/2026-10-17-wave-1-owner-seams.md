---
date: 2026-10-17
wave: 1
lens: implementation
slug: owner-seams
brief: product-brief.md
---

# Recon Wave 1 — owner-seams

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Paths are relative to `skills/spec/tools/` unless shown otherwise. Four agents: identity, crew, suggestions, who-is-on-what.

## Verified

**Identity ("me")**
- `core/git.ts:35-38` `authorName()` = `git var GIT_AUTHOR_IDENT` name part; `undefined` on failure. On Linux with no `user.name`, `git var` falls back to the login/GECOS name instead of failing (unless `user.useConfigOnly`), so "can't tell" can silently become a made-up name.
- `board/load.ts:39` passes it to `buildBoard(inputs, now, me)` → `Board.me` (`board/model.ts:167-168`). **`commands/crew/tick.ts:138` calls `buildBoard(inputs, now)` without `me`.**
- Remote claim holder = `authorName ?? "unknown"` + `os.hostname()` (`claims/remote.ts:16,21-22`, `commands/claim.ts:32`, payload `claims/remote-payload.ts:7-10,25-31`). Local claim files carry no user (`claims/store.ts:9-19`).
- PR author = gh login (`pr/checks/rollup.ts:94`, `pr/gh-lists.ts:7`).
- Matching: `board/people.ts:16-26` `personKey` (lowercase, a–z0–9) + `samePerson` (prefix, ≥3 chars, never `unknown`). Teammates bucket by exact key; only "me" merges by prefix (`:28-42`).
- CRM data: authors `anton-haskevych`, `Anton Haskevych`, `Taras Korpach`; noreply logins `anton-haskevych`, `taraskorpach`. Owner values: only `owner: taras` on 6 specs (cross-studio, staff-ios-app-release, staff-ios-app-multi-location, tap-to-pay-payments, gift-cards, permission-aware-ui). `taras` matches both of Taras's names. No phase-level or backlog `owner:` in CRM. All 4 remote claim refs on origin are `anton-haskevych@Antons-Laptop.local`; none from Taras yet.
- Cross-OS: hostname is display-only; sessions dir `CLAUDE_CONFIG_DIR ?? ~/.claude` (`sessions/live.ts:30-31`); `ps` format works on procps. Only `launch` terminals are mac-specific (tmux works on Linux; crew uses `claude --bg`).

**Owner data**
- Spec level only: `core/spec-meta.ts:23,39,51,93-97` (single string, doctor error otherwise) → `SpecNode.meta.owner` (`graph/nodes.ts:16-25,53`) → `FocusRow.owner` (`board/focus.ts:76`, `board/model.ts:148`) → `— (<owner>)` (`board/render-focus.ts:70`).
- Phase: `PhaseState` (`core/spec-state.ts:14-28`, `loadPhase` `:54-73`) has no owner. Backlog: `BacklogItem` (`backlog/items.ts:9-49`) has no owner. Yet `SKILL.md:387` and `idea.md:23` promise both.
- `ReadyRow`/`FlightRow`/`BlockedRow` (`board/model.ts:49-92`), `SpecState` (`spec-state.ts:30-37`), `Pick` (`crew/pick.ts:5`) carry no owner. `BoardInputs.nodes` (`board/inputs.ts:32`) holds every spec's meta.

**Crew**
- `crew/pick.ts:12-25` `pickRows(ready, states, busySpecs, unanswered, slots)`; only caller `commands/crew/tick.ts:113` (`fillSlots`). `TickWorld {sessions, claims, ready, states}` (`tick.ts:25-30`); `systemTickPorts.world()` (`:133-139`) has `inputs.value.nodes` and drops it.
- Single choke point for every crew start (tick refill, relaunches, hand `crew launch`, babysitters): `commands/crew/launch-session.ts:34 launchCrewSession`. Order: run-file check `:35-36` → `sessionLaunch` `:39-40` → **`placeForLaunch` `:42` (cuts/places a tree — side effect)** → `shipOf` reads frontmatter from the placed tree `:72-80`. A refusal after `:42` leaves a tree behind.
- Refusals are returned strings (`crew launch: <reason>`), exit 0; tick shows `<spec> <phase> not launched: <line>` (`tick.ts:126`); `oversee-crew.md:92-94,119` list the known refusals.
- `crew start` (`commands/crew/overseer.ts:19-35`) never picks; precedent for fail-closed: `crew start: CLAUDE_CODE_SESSION_ID is unset…` (`:27-28`), `crew tick: can't read sessions …; acting on nothing` (`tick.ts:55`).
- Run file `<git-common-dir>/spec-board/crew/run.md` (`crew/deps.ts:38-53`), per clone, never committed. `RunFile` (`crew/run-state.ts:29-42`) records the overseer session id, no person.
- **Why the skip rows failed**: `QUESTION = /^- \[(\w+)\] (\S+) (\S+) · /` (`run-state.ts:45`) needs `<spec> <phase> · `; CRM rows `cross-studio (all phases) · …` don't parse and are dropped; pickRows matches exact spec+phase (`pick.ts:20`), so no spec-wide skip exists. `parseRunFile` on CRM's run.md yields 1 unanswered row of ~40.

**Suggestions**
- Ready lane: `board/lanes.ts:41-73` `buildBoard` → `rankReady(withFocusPositions(markSafe(...)))` (`:51`) → `focusLane` reads the ready lane (`:53`; `focusNow` `board/focus.ts:95-98`). Rows: `phaseRow` `:162-182` (has `node.meta` + phase; priority already falls back phase→spec at `:175`), `stageLanes` `:139-160`, `readyInRow` `:119-123`, `branchOnlyLanes` `:126-137`.
- `BOARD_VERSION = 2` (`board/model.ts:8`), pinned in `tests/board-command.test.ts:36`, `tests/board-lanes.test.ts:115`.
- `--who`: `commands/board.ts:34-49` refuses any lane but focus (`:45`); `boardFor`/`focusFor` (`board/people.ts:45-56`) filter only `lanes.focus`; `--json` ignores the lane word (`:26`).
- Places that suggest work: Next sessions (`SKILL.md:156-172`, prose, reads `board --json`, "don't re-derive lanes"; pins own spec at row 1 in handoff `handoff.md:178`, review `review.md:345`, create `create.md:375`); execute §0.2 top ready row (`execute.md:22`, `board ready --json --local`, `commands/context.ts:29-31,60` `APPLY_TOP_READY`); crew fill; overseer reads `board --json` (`oversee-crew.md:51,100`); resume/execute packs' phase pick `firstUnheld` (`context/held-phases.ts:5-13`, `context/packs.ts:43-48`, `commands/context.ts:94-106`); `spec.ts ready` (`commands/ready.ts:7-13`); `spec.ts list` (`commands/list.ts:42-60`, `portfolio/*`). Prep does not print Next sessions today (`prep.md` ends with a soft create offer).
- Ready render: `board/render.ts:60-74` — note column (`readyNote`) joins band, stale, placement with ` · `; natural home for an owner mark. Golden test `tests/board-no-focus-golden.test.ts:32-53` pins the render (fixtures have no owner).

**Who is on what**
- Cross-machine signals: remote claim refs (`claims/remote.ts:38-44`, git name) and gh PR authors only. Sessions, local claims, worktree overlays are this machine only. `--local` drops sessions, remote claims and PRs (`board/load.ts:45,50,52`).
- PR author is used only in `focusWork`; `attachPrs` (`board/joins.ts:32-44`) drops it. Flight rows have `holder` only for claims; local holder = session label, no user (`claims/rules.ts:59-65`).
- `list.md:11-12,25` answers "what is X on" via `board focus --who`, falling back to Claude grepping `flight --json` holders — prose only, misses owned non-focus specs and PRs. Real run `--who taras --local`: 4 focus rows, all `— (taras)`; misses `staff-ios-app-multi-location`, `tap-to-pay-payments`.

## Reuse
- `authorName` for "me"; `samePerson`/`personKey`/`ME` for matching; `node.meta.owner` via `BoardInputs.nodes`; `phaseRow`'s phase→spec fallback pattern (priority) for phase owner; `FocusRow.owner` as the field to copy onto `ReadyRow`; `readyNote` for the owner mark; `focusWork` bucketing, `remoteHeldClaims`/`HeldClaim.holder` (`claims/held.ts:27-33`), `PrRow.author`, `attributeSessions` for the per-person view.
- Refusal conventions: `crew launch: <reason>` strings; fail-closed precedents in `crew start` and `crew tick`.
- Tests: factories `tests/board-factories.ts` (`readyRow`, `specFixture` with `meta`, `boardInputs`, `board`), `tests/factories.ts` (`phaseState`, `specMeta`, `backlogItem`); `crew-tick.test.ts` injects `world.ready` (git-free); `board-command.test.ts:72-111` real-git `--who` fixture with `owner: Taras Korpach`; identity-less runner case `tests/git.test.ts:70`; `tests/git-repo.ts:8-9` fixes `GIT_AUTHOR_NAME: spec-tests`.

## Must build
- `owner` on `PhaseState` and `BacklogItem` (parse + doctor); resolved owner (phase beats spec) on `ReadyRow` (additive JSON).
- `me` into crew tick; owner filter in `pickRows`; owner refusal in `launchCrewSession` **before** `placeForLaunch`, reading owner from base nodes, not the placed tree.
- A "can't tell who you are" result for the crew (and suggestions) that does not trust git's Linux fallback name.
- A filtered view for suggestions (Next sessions, execute §0.2, overseer) without filtering the stored ready lane.
- A per-person view across lanes: owned specs (any lane), remote claims, PRs by author, plus this machine's sessions for me.

## Neighbors
- `oversee-crew-spec` (open; only task phase 6 "CRM adoption" left): owns `oversee-crew.md` and the crew tools. **related** — this spec changes its pick rule and launch refusals; no shared open code phase.
- `spec-loop-automation` (open; only task phase 10 "CRM adoption" left): touches `SKILL.md`. none beyond a file overlap.
- `active-work-view`, `spec-board`, `self-driving-loop`, `spec-spin-off`: finished. `active-work-view` built `--who`/`people.ts`/`owner:` → **related** (this extends its view beyond FOCUS); its ledger `principle-session-attribution-scope-and-order` and `decision-focus-row-sessions-stay-on-the-row` apply.

## Gotchas (project lessons)
- `gotcha-spec-ts-exits-0-on-refusal` — owner refusals are a printed line; prose must read it.
- `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner` — identity tests need `isolatedRunner`; the "unset" case needs an identity-less runner.
- `gotcha-execute-pack-headroom-is-thin` — execute pack ~28K/30K; owner text in packs needs budget.
- `gotcha-execute-section-0-is-skipped-on-the-resume-path` — a §0-only owner check misses resume.
- `gotcha-remote-claims-never-read-as-done` — per-person live work from remote claims must check the phase on base.
- `gotcha-session-files-span-every-repo` — scope sessions by `ownerOf` before listing a person's.
- `gotcha-trees-place-reads-pr-group-from-base` — base-read paths don't see an owner set only on a branch.
- `gotcha-session-runs-the-cached-plugin-not-the-branch` — prose changes are tested only after release.

## Still open
- **Live data conflict (for the user):** CRM `permission-aware-ui` is `owner: taras` but Anton's crew works it (q30, q38, 3b). The filter would stop Anton's crew there.
- Hard-coded "Anton" across crew prose (`oversee-crew.md:5,17,74,78,130,151,162,190`, `crew-brief.md:23,30,53`, `execute.md:30,212`, `launch/command-line.ts:35`, `core/spec-meta.ts:8`): if Taras runs the crew, briefs say "Anton answered". In scope of "whoever runs the crew"? Decision for create.
- Next sessions' own-spec pin at row 1 vs the owner rule (handoff/review of someone else's spec). Decision for create.
- Needs-you items and `spec.ts list`/`ready`: filter, mark, or leave. Decision for create (brief: mark, don't hide, for views).
- Prefix matching is loose (`ant` ⊂ `antonhaskevych`); acceptable for two people, record as a risk.
- Babysitters go through `launchCrewSession` too: does an owner check apply to a babysit of someone else's PR group? Decision for create.
