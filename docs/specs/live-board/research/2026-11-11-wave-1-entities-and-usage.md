---
date: 2026-11-11
wave: 1
lens: implementation
slug: entities-and-usage
brief: product-brief.md
---

# Recon Wave 1 — entities and usage

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Seven agents: three on code (plugin entity inventory, the Academy board as built, the stale-state seam and the
2026-11-11 incident) and four on a digest of the 198 newest CRM sessions (2026-10-22 → 2026-11-11). Plugin paths
are relative to `skills/spec/`; `T/` is `tools/`. CRM paths are relative to `~/IdeaProjects/crm/`.

## Verified

### Why sessions disagree (the seam)
- **Packs and `spec.ts ready` read only this worktree's files** (`T/commands/context.ts:73-88`, `T/context/packs.ts:53,73`,
  `T/commands/ready.ts:9-12`). The only cross-tree input is other sessions' live claims (`T/context/held-phases.ts:5-12`);
  a released claim hides nothing. The report's `Left:` line comes from `ready` (`SKILL.md:189`).
- **The board reads origin/default plus a worktree overlay** (`T/board/load.ts:21,54`, `T/mainline/load.ts:59-72`,
  `T/workspaces/scan.ts:22-46`, `views.ts:10-24`). Sources are never merged (`T/board/activity.ts:10`): base "done"
  wins (`:36`), a tick only in a worktree is "in flight" (`:37`), ready is computed from the base alone
  (`T/board/lanes.ts:108`). The overlay only sees worktrees on this machine.
- **Every phase write lands in local files** (`T/commands/phase.ts:47-146`, `T/core/apply-edits.ts:20-27`): tick
  (`T/phases/tick.ts:44,61-65`), add (`add.ts:38-41`), split (`split.ts:55-65`), deployed (`deployed.ts:30-37`).
  Review commits locally and publishes at handoff (`review.md:326-334`).
- **`publish-docs` refuses on any conflict and the session is told not to retry** (`T/publish/publish.ts:23-24,45`,
  `handoff.md:147`). Its snapshot base is the merge-base (`T/publish/snapshot.ts:44-63`) and merge-back never brings
  main's changes in (`publish.ts:59-61`). Two phases ticked on adjacent `progress.md` lines in two trees always conflict.
- **Usage counts** (198 sessions): `phase tick` 106, `publish-docs` 59, `claim take` 78, `claim list` 100,
  `board ready` 94, `ready` 88, `trees place` 79, `launch execute` 70, `phase add` 16. 116 sessions open with
  `/spec execute`, 23 babysit, 8 prep, 6 review, 5 the Academy board.

### The 2026-11-11 incident (`schedule-clarity-fixes`, CRM, `docs: main`)
| Tree | Phase 1 | Phase 2 | Phase 3 | 6a / 10 |
|---|---|---|---|---|
| main (`f151f2d137`) | ✓ | ☐ | ✓ | present |
| pr-a (`0651e4e87f`) | ✓ | ✓ | ☐ | absent |
| pr-b (`358b0843d1`) | ✓ | ☐ | ✓ | absent |

- 15:57 pr-b published the phase 3 tick (`623b0ee37b`). 17:26 pr-a ticked phase 2 (`0651e4e87f`); its publish printed
  `diverged on main in …/progress.md — merge main first; nothing pushed` because main had changed the adjacent line.
- 17:25 the review added 6a and 10 locally (`ee3bc10920`); they reached main at 17:35:16 (`f9824ba2ca`).
- 17:34 a new pr-b session got "Ready now: 2 · 5" from its own stale files (`context.ts:78,88` → `packs.ts:73`) and
  `Left:` without 6a/10 from `ready`. pr-a had released its claim, so nothing hid phase 2.

### The same failure across sessions (S-numbers index the digest)
- Done work offered as open because it never reached main: S55→S63, S56, S105, S137, S99, S195→S198.
- A plan changed under running sessions: S28 (session started on the pre-review spec), S57→S61 (PR regroup), S192.
- Docs refused or unpushed: S13, S34/S42, S47, S66, S91, S195; main merged twice over other sessions' ticks (S65);
  ~80 add/add conflicts between local and origin main (S100, S135).
- Built, no PR, nobody tracking: S88, S117, S163 (PR C), S198 (PR A).
- Sessions blind to each other, Anton relays by paste: S40, S63, S100, S134/S135, S177.
- `ready` calls a phase "in progress" on one ticked box with no branch or session (S44).

### Entities the plugin stores today
| Entity | Key | Where | Notes |
|---|---|---|---|
| Spec | folder name | `CLAUDE.md` frontmatter | status, area/domain/scope, priority `p1-p3`, due, owner, focus, ship, stale, dropped, part-of/needs/supersedes/related (`T/core/spec-meta.ts`, `T/graph/relations.ts:13-46`). No `tags:` field in code; CRM stubs already write one. owner/focus/ship are committed straight onto origin (`T/core/land-on-main.ts:23-49`). |
| Phase | `spec#id` | `progress.md` line + phase-file frontmatter | done checkbox, `· deployed <date>`, needs / needs-deployed / same-files-as, pr group, due, code, playbook, gate (`T/core/spec-state.ts:14-28`, `phase-edges.ts:3-31`). Id stability is prose only. |
| Deliverable item | none | checkbox text in the phase file | matched by text prefix or `#N` (`T/core/phase-entry.ts:4-23`); evidence is a ` — ` suffix (`T/core/checkbox.ts:4-29`). |
| Idea | slug | `docs/specs/_backlog/<slug>.md` | title, tags[], priority, due, resolution (`T/backlog/items.ts:9-47`). Promotion link is free text. |
| Claim | `spec#phase` | git common dir + `refs/spec-claims/*` | session, workspace, branch, holder user@host (`T/claims/store.ts:9-39`, `remote.ts:25-65`). A second versioned shape with `SessionRef` exists (`T/claims/document.ts:7-63`). |
| Session | Claude session id | `~/.claude/sessions/*.json`, computed | liveness per machine only (`T/sessions/live.ts:13-78`); tied to a spec by claim, then launch title, then tree (`T/board/attribution.ts:15-45`). |
| PR group | phase `pr:` value | computed | `PR #n · <branch>` line in `pr-opening.md` is prose; merge line written by `T/pr/actions/merge-line.ts:17-33`; reader extracts only `#n` (`T/pr/resolve.ts:17-24`). |
| Question for a person | none | `## Needs you` in `in-flight/phase-<id>.md`, crew `run.md` `## Questions`, `Gate:` items | three shapes (`T/core/park.ts:4-66`, `T/crew/run-state.ts:6-102`, `T/core/gate.ts:8-23`). |
| Board | — | rebuilt every call, never stored | `BOARD_VERSION = 3` (`T/board/model.ts:8,199-224`). |

No schema library; every validator is hand-written (`T/doctor/*`, `T/hooks/spec-file-check.ts:34-40`).

### The Academy board as built (`ops/src/academy-board/`, 90 cards, 399 sources, 24 groups)
- Three strict zod collections (`board-schema.ts:3-54`): card, source, group. Cross-doc rules run only on `check`
  (`doc-reads.ts:42-58`).
- Store: one JSON file per doc in `CRM-Dance/academy-board`; version = git blob sha; a batch (≤50) is one commit via
  the Git Data API; branch moved → re-plan up to 5 times; doc changed → `conflict` with the current doc
  (`doc-writes.ts:92-118`, `github-repo.ts:45-93`, `board-store.ts:4-40`). 124 commits in 9 days, two authors.
- Agents pin versions (`board-actions.ts:16`); the page writes unpinned, last write wins (`server.ts:74`).
- Page: local server on 4777, polls the head every 5 s, pushes the whole snapshot over SSE (`server.ts:6-59`).
- Hard-coded to Academy: repo (`github-repo.ts:4`), people `Anton|Taras` (`board-schema.ts:9`), port, titles,
  time zone, the `c\d+` rule.
- **Card ↔ spec is free text in both directions.** 50 of 90 notes start `Spec: <name>` (30 distinct specs, all real),
  8 `Backlog:`, 19 `No spec`; 29 notes cite PRs, 34 cite phases. About 19 CRM spec folders mention cards in seeds,
  `CLAUDE.md` or phase checklists ("Close the board card c49…"). Nothing checks either side.
- Link shapes seen in use: several cards → one spec (c87–c90 + c74), one card → several specs (c59), one spec → two
  cards (c81, c82), a card covering part of a spec (c38, c06).
- Data smells: tag `Shipped` (29 cards) duplicates status `done`; `projects` used by 4 cards; `order` mixes integers
  and timestamps; `person` spelled four ways; `groups.spec` is prose; `claimed_by` only ever Taras.

### What people track that has no stored home (from the sessions)
- Which session is in which tab and tree, and whether it is alive (asked or relayed in ≥12 sessions).
- PR number and state per PR letter; built-but-unopened PRs; deploy state per phase.
- Questions and approvals waiting on Anton, given in chat ("Two open questions exist only in this chat", S63;
  "where did that idea come from" about his own approval, S163).
- Customer follow-ups owed ("tell Chasity it's live") and promises with dates.
- "What is phase X about?" asked about 18 times; launch rows carry a title, not the outcome.
- Three priority scales: scope `P0-P3` + card `urgent` (board), `p1-p3` (backlog and specs), `p0` written on specs.
- Other customers' asks sit on Academy's board (c88, c89) or in the backlog (Clearwater, S166).

## Reuse
- **Version-pinned doc store** with per-doc conflict and whole-batch commit: the Academy store's three modules
  (`github-repo.ts`, `board-store.ts`, `doc-writes.ts`, 254 lines, with tests).
- **Lease-pushed refs** for create-only shared state: `T/claims/remote.ts`, `remote-take.ts`.
- **Commit onto origin's tip without touching the checkout:** `T/core/land-on-main.ts`, `T/publish/commit-onto.ts`.
- **"Plan a validated change, then apply"** phase writers: `T/phases/*.ts` + `T/core/apply-edits.ts`.
- **Ref grammar** `<spec>` / `<spec>#<id|N-M>` (`T/graph/relations.ts:34-46`) fits card → spec/phase links as is.
- **Board model, lanes and renderers** (`T/board/model.ts`, `lanes.ts`) stay; only their inputs change.
- **Source model and deadline/quote rules** from the Academy skill carry over unchanged.

## Still open
- Where the shared record lives (separate repo, refs in the project repo, or commits on main): latency, what a
  write triggers in CRM, local grep copy, offline behaviour. → wave 2.
- How narrow the plugin's read/write funnel is, and which mode files tell Claude to hand-edit state. → wave 2.
- What the plugin can ship (dependencies, an MCP server, a page) and per-project configuration. → wave 2.
- Whether the phase file keeps a copy of plan fields or the record is the only home (split-brain risk).
- Whether hand-off notes (`in-flight/`) belong on the record: they miss main the same way ticks do.

## Neighbors
- `codex-runtime-support` (open, phase 2b "Shared ownership, board and worktree coordination"): owns the
  runtime-neutral session identity (`SessionRef`, `T/claims/document.ts`). Relation: `related`; the session and claim
  records here must be built on its identity model, and 2b should land or be sequenced first. **Scope question.**
- `pr-babysit` (open, only its CRM-adoption task left): shares `context.ts`, `claims/store.ts`. `related`.
- `spec-loop-automation` (open, only CRM adoption left): built the phase writers this re-targets. `related`.
- `oversee-crew-spec` (open, CRM adoption left): the crew reads the ready lane and writes `run.md` questions. `related`.
- `spec-board`, `active-work-view`, `self-driving-loop` (finished): built the board model and packs this feeds. `related`.
