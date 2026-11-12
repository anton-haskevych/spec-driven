---
date: 2026-11-11
spec-phase-at-review: Phase 1 — The shared record (nothing started)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: write-contract-and-switch-day
---

# Review — write-contract-and-switch-day

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

All five reviewers returned **fix-then-proceed**. Nobody questioned the spine: one git ref outside the branches,
small JSON documents, a version check per document, `SpecState` as the read seam, and Anton's decisions as
written. The problems cluster in three places.

1. **The write contract.** A write is a fixed list of operations pinned to the document versions the caller
   read. A retry and the offline outbox re-send that same list. So two harmless changes to one phase refuse each
   other, any two plan changes on one spec collide on `spec.json`, and a session's own second offline tick is
   rejected by its first. Four reviewers reached this independently. The fix is the shape `landOnMain` already
   has: a plan function re-run against each freshly fetched tip, with the outbox holding the intent
   ("tick 2.4"), not pinned operations.
2. **The day CRM turns the board on.** Phase 2 says "only the inputs change", but five readers sit outside the
   named funnel: the spec-level done marks in `graph/nodes.ts`, the "no `progress.md` means prep" rule, the
   "in progress in another tree" guard, the edges-declared bit in the ready set, and the task counts parsed from
   entry text. Each would misbehave from phase 5 until phase 6 or later. Tidy (deleting `progress.md`) makes
   every one of them worse and removes the way back.
3. **Re-built house mechanisms.** The retry loop, the lease push, the safe local copy and the spec-field
   readers already exist in the plugin. The spec built new copies and planned to fold them later.

No finding says the approach is wrong. The plan changes shape in phases 1–4 and gains upgrade steps in 6–8.

## Forks put to the user

**Who owns making Codex write to the board?** A Codex pilot may run `phase tick | park | unpark` today
(`runtime/workflow-capabilities.ts:12,34`). On a joined spec that is either a shared write, which the pilot's
isolation rule forbids, or a tick into frozen files nobody reads.
- Refuse for now: Codex reads the board and refuses phase writes on a joined spec; `codex-runtime-support`
  adds board writes in its own time.
- Add a phase to live-board that lets Codex write the board.
- Specs with a live Codex session don't join.

Anton, 2026-11-11: **"Refuse for now (Recommended)"**. Ledger: `decision-codex-reads-the-board-refuses-writes.md`.

## Resolved by the synthesizer

- **Plan function, not pinned ops.** `writeRecord(port, plan)` re-runs `plan(snapshot)` per attempt. `ifVersion`
  stays only where a person or Claude edits a value they looked at (page edits, `card update`).
- **One retry loop, built in phase 1.** The principal engineer said drop the `landOnMain` retrofit; prior art
  said generalise `landOnMain` in phase 1. Both reject phase 6's merge of two finished loops. Chosen: phase 1
  builds `core/land-on-ref.ts` and `writeRecord` is its first caller; `landOnMain` becomes a thin caller in
  phase 6, which is a swap, not a merge.
- **Tidy never deletes `progress.md`.** It leaves the banner as a stub, which is also the Bun-free marker for
  "on the board". `record export <spec>` writes the lists back and is the rollback.
- **"Joined" decides reads; the setting only gates joining.** The setting is read from the default branch.
- **The board needs `docs: main` in this version.** CRM runs `docs: main`; a `docs: branch` project gets a
  refusal line. Supporting it is later work.
- **The tick's save-push skips pre-push hooks, with a timeout and no credential prompt**, as claims do. CRM has
  no pre-push hook today (checked: no `.husky`, no `lefthook.yml`, no `core.hooksPath`).
- **A tick with uncommitted code edits warns, it does not refuse** (softer than the tester asked).
- **Phases 2 and 3 are split** into 2, 2a and 3, 3a, 3b, all still in PR B.
- **Both homes sit behind one `PhaseWriter` port** and the commands work on file specs too, so mode files say
  "run the command" once. Only `create.md` keeps two cases.
- **Each release that moves data to the record raises the record's layout number and upgrades a spec on its
  next touch.**
- **Session documents keep who, tree and mode but not `holds`** (computed from claims), are named by the whole
  session key, and are stamped last-write-wins by the command layer.
- **Names:** `status` stays `status` (command `spec-status`); the computed phase value is `PhaseStage`; the
  write outcome says `landed`, as `MainLanding` does.
- **`board.people` stays** as the list of display names, matched with `samePerson`.

## Findings

Severity is the synthesizer's. `verified` = the cited code was opened and says what the finding claims.

### R1 — Writes pin whole documents; retries and the outbox can't absorb concurrent changes
- signal: consensus (principal-engineer F1, adversarial-tester F1 + F9, code-quality F7, prior-art F1, integration F7) · severity: critical · verified
- evidence: the Academy `mergePatch` replaces arrays (`crm/ops/src/academy-board/doc-writes.ts:35-43`), so a
  tick rewrites a phase's whole `tasks` array; `landOnMain` re-runs its plan per attempt
  (`core/land-on-main.ts:23-38`); `technical.md` pinned every op and bumped `planVersion` in `spec.json`.
- consequence: offline ticks 2.3 then 2.4 conflict with each other; `phase add` and `phase set` on different
  phases refuse each other; the outbox is shared by every worktree with unlocked numbering, so one session
  flushes and is shown another's conflicts; reads don't show queued changes, so Claude ticks twice.
- applied: plan function re-run per tip; intents in the outbox, tagged by session, created exclusively,
  flushed under a lock, overlaid on reads; a tick never raises `planVersion`; edges and cycles re-checked
  against the fresh tip.

### R2 — Readers outside the funnel break on the day the board turns on
- signal: consensus (code-quality F4, adversarial-tester F4, integration F1 + F5) · severity: critical · verified
- evidence: `graph/nodes.ts:42-46,69-72` parses `progress.md` for done marks that feed `isFinished`,
  `ready/refs.ts:21-29`, lanes, overlap and the list; `commands/context.ts:80` returns an empty pack without
  `hasProgress`; `mainline/load.ts:72` calls such a spec prep; `phases/validate.ts:15-22` and the doctor's
  progress check parse `progress.md`; `claims/rules.ts` is listed as a `loadSpecState` caller and is not one.
- consequence: after phase 5 a joined spec never reads as finished, so every spec that needs it stays blocked;
  the doctor reports frozen boxes as errors and the "fix every error" rule pushes Claude to hand-edit them.
- applied: phase 2a moves the done marks in `loadNodes` to the record, sets `hasProgress`, skips the frozen
  checks for joined specs; the caller list is corrected.

### R3 — Phase 2 pointed the file planners at record-built text
- signal: unique-insight (code-quality F3) · severity: high · verified (`phases/tick.ts:27,38-44`)
- consequence: with the switch on and phase 3 not yet built, a tick writes the rendered checklist into the
  prose file and ticks the frozen `progress.md`.
- applied: file planners keep `loadSpecStateFromFiles`; phase 2a makes phase writers refuse on a joined spec
  until phase 3 replaces the refusal.

### R4 — Task counts come from parsing entry text, so frozen boxes double or mask the live ones
- signal: consensus (code-quality F5, integration F4) · severity: high · verified (`core/phase-entry.ts:18-31`, `core/spec-state.ts`)
- applied: for a joined spec the summary is built from the task documents; the prose file's Deliverables
  section is dropped from `entry` and the live tasks rendered in its place; the one count rule moves to
  phase 2a and takes tasks.

### R5 — Skipping the worktree overlay drops the "in progress elsewhere" guard
- signal: unique-insight (integration F2; adversarial-tester F11 in part) · severity: high · verified
  (`commands/claim.ts:77`, `claims/rules.ts:55`, `trees/find.ts:98-103`, `board/activity.ts:35-42`)
- consequence: a tree ticks two tasks and releases its claim; the next session is neither refused nor sent to
  that tree and redoes the work.
- applied: phase 2a builds `PhaseActivity` for joined specs from task evidence (`on origin/<branch>` → the
  worktree on that branch) and feeds the three consumers; nothing under `claims/` changes.

### R6 — `PhaseDoc` loses whether edges were declared
- signal: unique-insight (integration F3) · severity: high · verified (`core/phase-edges.ts:3-22`, `ready/ready-set.ts:17,33-41`)
- consequence: a linear spec joins with `needs: []` everywhere and every phase is ready at once.
- applied: `planJoin` writes the implied edges, so a joined spec always has declared edges; golden test
  before/after join.

### R7 — Tidy removes the manual read path, the rollback and the stage marker
- signal: consensus (principal-engineer F3, code-quality F8, adversarial-tester F3 + F14, integration F1 + F11) · severity: high · verified (ROADMAP "every flow keeps its manual read path"; `SKILL.md` routing on `progress.md`)
- applied: tidy leaves a banner-only `progress.md`; new specs get the same stub; `record export`; the manual
  `git fetch` + `git show` read is documented; tidy checks per file, in local trees and on the spec's remote
  branches; the phase 5 rollback note is rewritten.

### R8 — Releases C–F move data while the board is already on
- signal: unique-insight (adversarial-tester F2) · severity: high · loaders verified, the gap itself inferred
- consequence: the day PR C installs, every spec that joined earlier has no owner, focus, ship or PR documents
  on the record; the person still on PR B writes them to the old home.
- applied: `RECORD_LAYOUT` goes up with each data-moving release, an older plugin refuses to write, and a spec
  is upgraded on its next touch with readers falling back to the file home until then (phases 6, 7, 8).

### R9 — Each worktree reads the switch from its own checkout
- signal: unique-insight (adversarial-tester F3) · severity: high · verified (`playbook/settings.ts:58-61`)
- applied: joined decides reads; the setting gates joining and is read from the default branch.

### R10 — Join: positional matching, the other machine's ticks, half-finished joins, `docs: branch`
- signal: consensus (adversarial-tester F5 + F15, integration F8) · severity: high · `docs: branch` verified
  (`playbook/settings.ts:42`, `core/land-spec-field.ts:49`); the rest inferred
- applied: tasks match across copies by text, never by position; a tree ahead of the record is reported at
  load with `join <spec> --from-tree`; join refuses offline, creates `spec.json` create-only and re-lands a
  missing banner; the board refuses to turn on without `docs: main`.

### R11 — The tick's push has no timeout, can prompt, and runs pre-push hooks
- signal: consensus (adversarial-tester F6, prior-art F10, integration F12, code-quality F14) · severity: high · verified (`publish/push.ts:18-38` vs `claims/remote.ts:19,56-59`)
- applied: `pushBranch` takes network options and returns `offline | rejected | refused`; only `offline`
  queues; full sha stored; a queued tick pushes that sha and refuses if the branch no longer holds it.

### R12 — A missing ref or a busy ref lock reads as "origin unreachable"
- signal: unique-insight (adversarial-tester F7) · severity: high · exemplar verified (`claims/remote.ts:46-50`)
- applied: the port classifies absent / offline / busy; phase 1 deliverable and real-git test.

### R13 — The local copy can be read half-written and can go backwards
- signal: consensus (adversarial-tester F8, code-quality F7, prior-art F3, principal-engineer F7) · severity: high · exemplar verified (`mainline/base-cache.ts:14-32,71-79`)
- applied: fetch into a tracking ref, one folder per tip moved into place by rename, versions from `ls-tree`.

### R14 — A fourth push-with-retry loop, folded only in phase 6
- signal: contradiction on mechanism (prior-art F2, principal-engineer F6, integration F10) · severity: medium · verified
- applied: see *Resolved by the synthesizer*; also fixes `core/` importing `record/`.

### R15 — `record/` is called "no spec knowledge" and holds every document type
- signal: consensus (principal-engineer F4, code-quality F1, integration F10) · severity: medium · verified against the plan's own tree
- applied: the store takes its validator and its intent runners as parameters; readers live with their
  domains; the session stamp is added by the command layer.

### R16 — The record path is an `if` in every phase action, with no home for its planners and no end date
- signal: consensus (code-quality F2 + F9, principal-engineer F2) · severity: high · verified (`commands/phase.ts` six actions on `applyEdits`)
- applied: `PhaseWriter` port chosen once; record planners in `plan/ops/`; `commands/phase/` per action; the
  commands serve both homes so mode files have one path.

### R17 — Nobody says who fetches or how many times the record is read
- signal: consensus (principal-engineer F5, code-quality F6, integration F6) · severity: medium · verified (`mainline/load.ts:70` loops over every spec)
- applied: named fetch points; one `RecordView` per command, passed down.

### R18 — Codex pilot and the overlap with `codex-runtime-support`
- signal: consensus (integration F9, code-quality F12, adversarial-tester F16) · severity: medium · verified (`runtime/workflow-capabilities.ts:12,34`; open codex phases 2b, 3, 3b, 4)
- applied: the fork's answer; shared files added to the code-map; the `related` line names the shared seams.

### R19 — Session documents keyed by the source, duplicating claims, and conflicting as heartbeats
- signal: consensus (prior-art F4, adversarial-tester F12) · severity: medium · verified (`runtime/sessions.ts:5-16`, `runtime/identity.ts:7-9`)
- applied in phase 9 and `technical.md`.

### R20 — Offline, the before-edit hook can stall every edit for ten seconds
- signal: unique-insight (adversarial-tester F10) · severity: medium · verified (`SKILL.md` hook `timeout: 10`)
- applied: throttle by the last attempt, a 3 s fetch, back off after a failure.

### R21 — A PR's state moves only through our own commands
- signal: unique-insight (adversarial-tester F13) · severity: medium · inferred
- applied: `pr status` and the board's existing PR read refresh the PR document when it changed.

### R22 — Phases 2 and 3 are each more than one session
- signal: unique-insight (code-quality F10) · severity: medium
- applied: split into 2, 2a, 3, 3a, 3b.

### R23 — Readers and names re-declare what the house already has
- signal: consensus (prior-art F5, code-quality F13) · severity: medium · verified (`core/spec-meta.ts:52-120`, `core/schedule.ts:3`)
- applied: record readers call the existing field readers; `p0` extends `PRIORITIES`; names as resolved above.

### R24 — The page would re-compute the board in the browser
- signal: unique-insight (prior-art F7) · severity: medium · verified (`board/model.ts`, `board --json`)
- applied: the server serves the `Board` model plus versions for editable fields.

### R25 — Files near 250 lines are edited by four or five phases with no new home named
- signal: unique-insight (code-quality F11) · severity: medium · line counts read
- applied: `context/board-lines.ts`, `board/record-rows.ts`, `commands/card/` in the file tree.

### R26 — Outbox primitives and two undecided alternatives
- signal: unique-insight (prior-art F6 + F8) · severity: low · verified (`claims/atomic-file.ts:8-36`)
- applied: the outbox uses `createExclusive` / `removeIfUnchanged`; the decisions table records why one ref
  with a tree beats one ref per document, with the number to come from phase 1's growth run.

### R27 — Per-session memory in the common dir grows for ever
- signal: consensus (prior-art F9, code-quality F14) · severity: low · verified (`hooks/lesson-recall.ts:38-45`)
- applied: tmpdir, as lesson recall does.

### R28 — Card numbers and the one-origin rule under replay
- signal: unique-insight (adversarial-tester F17) · severity: low · inferred
- applied: `card add` refuses offline; the origin source is written in the card's own batch.

### R29 — Small mismatches with the code
- signal: consensus (integration F13, prior-art F10, code-quality F14) · severity: low · verified
- `commitOnto` already takes several files and needs only an optional base for the first commit; the tick
  calls `publish/push.ts` `pushBranch`, not `commands/push.ts`; the spec-file check runs after the edit and
  gives blocking feedback, it can't refuse; cards for ideas, prep and join depend on the switch; `Task` gains
  `unpushed`. All applied.

### R30 — Design said a split renames the phase
- signal: unique-insight (found while checking adversarial-tester F11) · severity: low · verified (`phases/split.ts` keeps the id and adds `nextLetterIds`)
- applied: `design.md` now reads "phase 3 keeps its id; 3a and 3b added".

## Rejected or unverified

- **One planner family over a document model, files as an adapter** (principal-engineer F2, option a). Not
  adopted: it rewrites file planners that 245 tests pin, for specs this work is meant to leave alone. The port
  gives one seam without it. Whether the file path gets an end date is left for after phase 5's week.
- **`plan apply` for file specs** (code-quality F9, in part). Not adopted: it would re-implement create's
  scaffolding. `create.md` is the one mode file that keeps two cases.
- **Refuse a tick when code edits are uncommitted** (adversarial-tester F6, in part). Softened to a warning in
  the result line; a session often starts the next task before ticking the last.
- **A claim left on an id that a split removed** (adversarial-tester F11). Rejected as stated: a split keeps
  the original id. Its other half, the lost take guard, is R5.
- **Local commits as the outbox** and **one ref per document** (prior-art F6, F8). Not adopted; recorded as
  rejected alternatives.
- **Drop the `board.people` roster** (prior-art F11). Kept: git names vary, and a card needs one display name.
- **Support `docs: branch` in join** (integration F8, option a). Not adopted in this version.
- **Squash-merged trees block tidy for ever** (adversarial-tester F14, in part). Unverified for CRM, which
  merges with merge commits; the per-file check makes it moot.
- **`sha7` ambiguity** (adversarial-tester F6, in part). Unverified; the full sha is stored anyway.
- **Snapshot reads every document on each write costs the one-second budget** (principal-engineer F7).
  Inferred; phase 1's growth run now records seconds per write.
