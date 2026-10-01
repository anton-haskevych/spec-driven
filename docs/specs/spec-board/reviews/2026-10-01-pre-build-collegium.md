---
date: 2026-10-01
spec-phase-at-review: Phase 1 — Spec readers (draft; nothing implemented)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: pre-build-collegium
---

# Review — pre-build-collegium

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

All five reviewers: fix-then-proceed. The layering (IO adapters → plain inputs → pure `buildBoard` →
versioned `Board` → views) is right and reuses `readySet`, `summarizeChecks`, `specPrNumbers`, `launch`.
The defects cluster in three places:

1. **The base reader.** The spec swapped the plan session's approved `git archive` cache for a blob
   reader. The 501 MB reason contradicts its own probe: an archive of only the read set takes 0.8 s. The
   blob path brings a byte-vs-string frame bug, virtual `SpecFolder.dir` paths that fall back to the
   cwd (the bug this spec exists to fix), and a read set that misses `pr-opening.md`. Going back to the
   archive removes all three.
2. **The overlay.** "Done if done in any view" feeds `readySet` and `isFinished`. That empties the
   in-flight lane for branch-only ticks, drops specs whose phases are all ticked on a branch, and shows
   dependents as ready from main without their dependency's code.
3. **Claims.** The claim is not reached by the code that picks the phase. Takeover is a non-atomic
   read-decide-write. Every failure of the session source turns every claim into `closed`, so anyone
   can take it over. Phases go unclaimed between sessions. `launch` opens every session in the
   caller's checkout.

## Forks put to the user

None. No reviewers contradicted each other on a design decision. No finding moves scope between specs
or changes what the feature is. No graduation candidate exists (`lessons candidates`: none). The base
reader returns to what the user already approved in the plan session
(`research/2026-10-01-wave-0-plan-session.md:53-54`).

## Resolved by the synthesizer

- **Base = `git archive` cache, not blobs.** Archive the read set at the base sha into
  `<git-common-dir>/spec-board/base/<sha>/`, extracting into a temp dir and then renaming. Load it with
  the unchanged `loadNodes` / `loadSpecState` / `loadBacklog`. This drops `gitTreeReader`, the
  cat-file parser, `loadNodeFrom`, `specsFromPaths` and the virtual-dir rule. Because `*/*.md` is in the
  read set, `pr-opening.md` comes along. Plan-approved; 0.8 s cold, ~0 s warm.
- **Two-state overlay.** Base-done alone drives `readySet` and `isFinished`. Workspace ticks and
  half-done phases become `PhaseActivity { tickedIn, wipIn }`. Lanes iterate phases not done on base.
  When a need is met only on a branch, the dependent is ready `in <workspace>` (no ★, launch targets
  that workspace), never ready from main.
- **Phase 1 ships a visible board.** Phase 1 becomes "Board from main" (base cache, model, ready and
  blocked lanes, rank, render, `list`). Phase 3 becomes "In-flight overlay". Each extraction moves to
  the phase that first uses it (principles §9). Ids are unchanged; the slugs of phases 1 and 3 change
  (draft, nothing executed).
- **Command surface.** `list` with no args shows the board. `list <filter>` and `list table` print
  today's table unchanged, so `list blocked`, idea and prep dedupe keep working. Agents and lane views
  use a tool command, `spec.ts board [<lane>] [--json] [--local]`, which is not a `/spec` sub-command.
  `list --json` is unchanged.
- **Claims.**
  - Takeover is atomic: rename the old file to `.stale-<sessionId>`, then create with `wx`. The
    content is written via temp + `link`.
  - Liveness fails safe. Unreadable sessions give status `unknown` and no takeover. A session is alive
    only when its pid is alive and its `procStart` matches.
  - `take` also refuses when another workspace holds the phase as wip or ticked.
  - The board is read-only: claim cleanup happens in `take` / `release`.
  - Packs skip live-claimed phases. An explicit phase hint stops instead of auto-switching.
  - Prep claims are dropped (YAGNI; no wiring, no done rule).
- **Launch target.** Board rows carry a target workspace. A continuing row runs `cd <worktree>`. A
  fresh row runs `claude -w <spec>-<phase>`, a CLI flag confirmed in `claude --help` that triggers the
  user's WorktreeCreate hook. The phase goes in the session title.
- **Render.** Keep the aligned-text design, printed inside a code fence and padded with
  `Bun.stringWidth`. Recorded as a decision with markdown tables as the rejected alternative.
- **Resume neighbor line.** No new A.4 bullet. The resume pack's existing overlap line marks specs
  that hold a live claim.

## Findings

Each finding lists severity, signal, verification status and the personas that raised it.

### Base reader

- **B1. Blob reader replaces the plan-approved archive; the reason given contradicts the probe.**
  - Severity high · unique-insight · verified.
  - Raised by: prior-art F1.
  - Evidence: wave-1:40-41 (archive 0.22 s + 0.6 s) and wave-0:53-54 (approved).
  - Applied: decision 4 rewritten, Phase 1 rebuilt on the archive.
- **B2. cat-file frame sizes are bytes; `Runner` returns a decoded string.**
  - Severity high · consensus · verified (`core/run.ts:27`).
  - Raised by: code-quality F1, integration F3.
  - Superseded by B1: an archive goes to a file and never through stdout. Lesson recorded in the
    project ledger.
- **B3. Blob specs keep a virtual `dir`; `spec.dir` disk readers resolve it against the cwd.**
  - Severity high · consensus · verified (`pr/resolve.ts:30`).
  - Raised by: principal F1, code-quality F9.
  - Superseded by B1: the cache is a real directory.
- **B4. `pr-opening.md` is missing from the base read set, but the PR join and the "open PR" stage
  need it.**
  - Severity medium · consensus · verified (technical.md:60-61 vs :160).
  - Raised by: principal F1, code-quality F6, integration F5, adversarial F10.
  - Applied: the read set includes `*/*.md`.
- **B5. Backlog count and `checks.external` read from the cwd break "identical from any checkout".**
  - Severity low · consensus · verified (`backlog/items.ts:21-28`).
  - Raised by: code-quality F12, integration F12.
  - Applied: both are read from the base cache (`_backlog/`, `_playbook/`).
- **B6. A second fetch path instead of `pinDefault`; `RunOptions` has no timeout.**
  - Severity low · consensus · verified (`snapshot.ts:24-28`, `run.ts:7-11`).
  - Raised by: prior-art F6, code-quality F10, integration F8, adversarial F11.
  - Applied: add `timeoutMs` to `RunOptions`, reuse `pinDefault`, run every network call with a
    timeout, pin the sha for later git calls.

### Overlay

- **O1. Done-anywhere feeds `readySet` / `isFinished`.** Branch-only ticks never reach in flight,
  specs with every phase ticked on a branch vanish, and dependents rank ready from main.
  - Severity high · consensus (4) · verified (`nodes.ts:64-67`, `ready-set.ts:21`).
  - Raised by: principal F4, integration F4, adversarial F6/F7, code-quality F3.
  - Applied: two-state overlay, `PhaseActivity`, dependents ready only `in <workspace>`.
- **O2. Two phase models (`SpecNode.phases`, `SpecState.phases`) have to be patched in step.**
  - Severity medium · consensus · verified (`ready/refs.ts:22-24`).
  - Raised by: principal F4, code-quality F3.
  - Superseded by O1: the overlay patches neither.
- **O3. "View" names collide with `PrView` / `PortfolioView`; `WorkspaceView` has two shapes.**
  - Severity low · unique · verified.
  - Raised by: code-quality F3.
  - Applied: `WorkspaceScan`, `PhaseActivity`.
- **O4. `paused` specs rank ready.** Branch-vs-base status conflicts and renamed or deleted spec
  folders are undefined.
  - Severity medium · unique · verified (`nodes.ts:59-61`).
  - Raised by: adversarial F13.
  - Applied: paused specs are left out of ready and counted in the footer; base status wins; workspace
    folders without `CLAUDE.md` are skipped.

### Claims

- **C1. Takeover is read-decide-write, so two sessions can both take over a closed claim.**
  - Severity critical · consensus · inferred from the design.
  - Raised by: adversarial F1, code-quality F7, integration F13.
  - Applied: rename to a unique stale name, then `wx`; a two-takers race test.
- **C2. Any session-source failure or empty read turns every claim `closed`, which allows mass
  takeover.**
  - Severity high · consensus · inferred.
  - Raised by: principal F2, adversarial F2.
  - Applied: `loadLiveSessions` returns a `Result`; on failure, status is `unknown` with no takeover;
    an unparseable claim counts as live; writes go through temp + `link`.
- **C3. PID reuse keeps a crashed session alive forever.**
  - Severity high · unique · verified (session files carry `procStart`).
  - Raised by: adversarial F3.
  - Applied: compare `procStart` with `ps -o lstart=` in one call; on duplicate session ids, the
    newest `updatedAt` wins.
- **C4. Claims never reach the pick.** The pack picks `ready[0]`; the claim at §1 comes after Stage B
  has loaded; the task-phase branch skips it.
  - Severity high · consensus · verified (`commands/context.ts:62`, `packs.ts:35`,
    execute.md:35).
  - Raised by: integration F2, adversarial F4.
  - Applied: the pack skips live-claimed phases; `claim take` is the first line of §1; a refusal
    re-runs `context execute`.
- **C5. Phases are unclaimed between sessions** (handoff releases), so a new session redoes
  half-done work.
  - Severity high · unique · verified (one-session-per-chunk loop).
  - Raised by: adversarial F4.
  - Applied: `take` refuses when another workspace holds the phase as wip or ticked.
- **C6. The board deletes claims by check-then-act, and path mismatches can delete live claims.**
  - Severity high · unique · inferred.
  - Raised by: adversarial F8.
  - Applied: the board is read-only; cleanup happens in `take` / `release`; a live claim is never
    deleted; both paths are realpath-normalized.
- **C7. Unvalidated phase ids, prep claims never wired, an explicit hint auto-switched, no session id
  skips the check.**
  - Severity medium · unique · verified.
  - Raised by: adversarial F14/F15.
  - Applied: validate ids, drop prep claims, stop on an explicit hint, refuse when no id and a live
    claim exists.
- **C8. Claims depend on undocumented Claude Code session files.**
  - Severity high · unique · read-in-code.
  - Raised by: principal F2.
  - Applied: the fail-safe from C2, a single reader module, and a ledger gotcha.

### Loop wiring and launch

- **L1. `launch` opens every session in the caller's checkout.** Parallel rows share one tree, and
  `only on <branch>` rows can't find their spec.
  - Severity high · unique · verified (`commands/launch.ts:8`, `command-line.ts:25`).
  - Raised by: integration F1.
  - Applied: rows carry their workspace; `cd <worktree>` or `claude -w`; phase in the title.
- **L2. `list --json` as the agent feed costs a fetch, the scan and gh, and carries backlog bodies.**
  - Severity medium · consensus · verified (`commands/list.ts`).
  - Raised by: principal F5, integration F7.
  - Applied: `spec.ts board --json [--local]`.
- **L3. Lane words collide with filters.** `list blocked` today filters on status; idea and prep
  dedupe call `list <words>`.
  - Severity medium · consensus · verified (`portfolio/order.ts:27-30`).
  - Raised by: principal F5, code-quality F5, integration F10.
  - Applied: filters keep the table; lanes go to `board <lane>`.
- **L4. handoff.md:172 says "Do not suggest further work", which contradicts the `Ready next:` lines.**
  The no-spec-named case lives in SKILL.md:32 and `commands/context.ts:33`, not execute §0.
  - Severity low · unique · verified.
  - Raised by: integration F11.
  - Applied: both are named in Phase 6.
- **L5. Session-to-worktree by cwd prefix puts launched and EnterWorktree sessions on main;** a string
  prefix also matches `foo` against `foo-bar`.
  - Severity medium · consensus · verified (wave-1:66-70).
  - Raised by: integration F9, adversarial F9.
  - Applied: claim session id first, then cwd prefix on path segments.
- **L6. The resume neighbor bullet would repeat the pack's existing overlap line.**
  - Severity medium · unique · verified (`graph/render.ts:22-24`).
  - Raised by: prior-art F4.
  - Applied: mark live-claimed specs on the existing line.
- **L7. In `docs: main` projects, publish-docs empties the worktree's spec-doc diff**, so the
  workspace loses its spec.
  - Severity medium · unique · verified (`publish/publish.ts:59-61`).
  - Raised by: integration F6.
  - Applied: claims map workspace to spec first; noted as an edge case.

### Workspaces

- **W1. A fresh worktree with only uncommitted spec docs classifies as merged and is never scanned.**
  - Severity high · unique · inferred.
  - Raised by: adversarial F5.
  - Applied: a worktree holding a claim or a live session's cwd is always scanned.
- **W2. One failing workspace can sink the scan; `unknown-base` is only checked above 1000 ahead.**
  - Severity medium · unique · inferred.
  - Raised by: adversarial F12.
  - Applied: `runAll` never rejects; a per-workspace failure is counted as `unreadable` in the footer.
- **W3. `specDocChanges` name clash with `publish/snapshot.ts:30`; `specsFromPaths` duplicates
  `locateSpecFile` / `isSpecDocPath`.**
  - Severity low · consensus · verified.
  - Raised by: principal F3, prior-art F5, integration F12.
  - Applied: rename to `workspaceSpecChanges`, reuse `locateSpecFile` / `isSpecDocPath`.

### PRs

- **P1. `rollupToChecks` is a second classifier, while `pr-status` trusts gh's `bucket`;** re-runs
  need dedupe.
  - Severity high (as raised) → medium (mine) · unique · house reliance verified (`pr/gh.ts:18`);
    the gh mapping details are unverified (from memory).
  - Raised by: prior-art F2.
  - Applied: mirror gh's state→bucket mapping, with a parity test against `gh-pr-checks.json`, and
    keep only the latest run per check name.
- **P2. Multi-PR specs, limit 100, branch reuse, zero-check PRs counted as "merge", unlinked PRs
  flooding needs you.**
  - Severity medium · unique · verified.
  - Raised by: adversarial F10.
  - Applied: per branch prefer OPEN then newest; "merge" needs ≥ 1 check; only joined PRs reach needs
    you; a linked PR missing from the list shows `?`.
- **P3. `prList(state, fields)` leaks gh flags to callers.**
  - Severity low · unique.
  - Raised by: code-quality F11.
  - Applied: `openPrs()` / `recentPrs()`.

### Structure

- **S1. `board/inputs.ts` becomes a god file; the mainline source has no home.**
  - Severity high (as raised) → medium · unique · inferred.
  - Raised by: code-quality F2.
  - Applied: `mainline/` domain; `inputs.ts` only composes.
- **S2. `lanes.ts` mixes lanes, needs-you rules and joins.**
  - Severity medium · unique · inferred.
  - Raised by: code-quality F4.
  - Applied: `lanes.ts`, `attention.ts`, `joins.ts`.
- **S3. Async `list` breaks the synchronous portfolio tests.**
  - Severity medium · unique · verified.
  - Raised by: code-quality F5.
  - Applied: a sync `portfolioTable` plus an async `board`.
- **S4. `overlapsWith` duplicates `undeclaredOverlaps`; hub semantics are off by one.** The code keeps
  usage ≤ 5; the spec said ≥ is ignored.
  - Severity medium · consensus · verified (`overlap.ts:19`).
  - Raised by: code-quality F8, prior-art F4, integration F12.
  - Applied: shared `sharedPaths` core; usage from all open specs; `> HUB_LIMIT` ignored; linked specs
    count for ★.
- **S5. Phase 1 extracts helpers before anything uses them.**
  - Severity low · unique · verified (principles §9).
  - Raised by: principal F6.
  - Applied: Phase 1 restructured.
- **S6. The aligned board needs width-aware padding; the house style is markdown.**
  - Severity medium · unique · verified (no padding helper exists).
  - Raised by: prior-art F3.
  - Applied: decision recorded; `Bun.stringWidth`; fenced output.
- **S7. Small fixes.**
  - Severity low.
  - Raised by: code-quality F12, prior-art F7.
  - Applied: `version: typeof BOARD_VERSION`; `ago` lives in render and uses `Intl.DurationFormat`
    narrow.
- **S8. Test gaps.** The real-git board test reads the real `~/.claude/sessions` and gh; claim tests
  outside a temp repo hit the plugin's `.git`; UTC vs local dates.
  - Severity low · unique · inferred.
  - Raised by: adversarial F16.
  - Applied: inject `claudeHome` and a gh stub; temp repos; fixed `now`.
- **S9. `code-map.md` is empty.**
  - Severity low · unique · verified.
  - Raised by: integration F13.
  - Applied: filled.

## Rejected or unverified

- **Prior-art F2's specific gh mappings** (`NEUTRAL` → skipping, `STALE` → pending,
  `STARTUP_FAILURE` → pending) are from the reviewer's memory of gh's source. Not asserted. The parity
  test against gh's own `bucket` output decides.
- **Integration F8: fetch-lock contention with another session's `publish-docs`.** Inferred, not
  reproduced. Mitigated by `--local` for resume and execute, which skips the fetch.
- **Principal F3: merge the publish and infer spec-doc change code into one module.** Narrowed. We
  reuse the path helpers and avoid the name clash, but don't refactor `publish/`. That is out of this
  spec's scope.
- **Adversarial F3: treat EPERM from `kill` as dead.** Superseded by the `procStart` comparison.
