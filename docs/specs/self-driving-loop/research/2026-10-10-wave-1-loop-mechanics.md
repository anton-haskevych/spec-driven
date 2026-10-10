---
date: 2026-10-10
wave: 1
lens: implementation
slug: loop-mechanics
brief: product-brief.md
---

# Recon Wave 1 — loop-mechanics

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Four Explore agents: pick + launch, spec-file collisions, start/close ritual + sync, reports + questions + prior art. Paths below are relative to `skills/spec/` unless they are written in full. Digests are the 70-session CRM corpus (session-scoped scratchpad, see seed.md).

## Verified

### One-word pick
- **The model writes the rows; no tool renders them.** SKILL.md:150-165 (*Next sessions*) runs `board --json`, prints up to 3 rows plus `Needs you:`, and "on approval" runs `launch execute <spec> <phase>` once per row (:163). The callers are handoff.md:174-176, review.md:350, create.md:376 and list.md:29.
- **Two numberings.** `board/render.ts:59-67` numbers ready rows by position. The model's rows put "this session's spec first" (SKILL.md:162). So the same "1" can mean different rows.
- **Nothing saves the rows.** `ReadyRow` (`tools/board/model.ts:46-65`) has `spec`, `phase?`, `target`, `next: prep|create|execute`, `treeBusy?` and `readyIn?`, and no `title` and no `tree`. Its only key is `rowKey` = `spec#phase` (`board/phase-keys.ts:19`).
- **No code parses the reply.** The only prose list is `"yes" = row 1, "start 1 and 2", "go"`. A bare "1" or "1 3" isn't listed. `context/request.ts:17-34` parses only `/spec` arguments (`isPhaseId` and `normalizePhaseHint` are reusable).
- **Launch** (`tools/commands/launch.ts:14-37`, `tools/launch/command-line.ts:17-29`):
  - it passes exactly `claude -n '<spec> <sub> [<phase>]' '/spec-driven:spec <sub> <spec> [<phase>]'`, with no extra instruction;
  - a phase is allowed only with `execute` (:22);
  - it places the tree only for `execute`+phase, and refuses when the tree is busy;
  - terminals are tmux, then iTerm (returns the tab number), then Terminal.app (`launch/terminal.ts:7-21`);
  - `parseLaunchTitle` reads the title back for board attribution and claims.
- **Why the launched session asks "go" again:**
  1. `resume` Stage A always halts (resume.md:71-79, :145 is a stated contract). Gate rows ("PR B gate") and prep/create rows have no launch mapping, so the model falls back to `launch resume` or `launch review`. Digest 64:3-14 and 04/17 show this.
  2. `execute` with every phase ticked prints "All phases complete" and stops (execute.md:24), so gate work always needs another prompt.
  3. Preflight's "Decisions for you" (`skills/phase-preflight/SKILL.md:137-140`) has no rule in execute.md:90, so the session halts to ask (digest 56).
  4. A launched `execute <spec> <phase>` already skips Stage A (SKILL.md:60, execute.md:10,26). Digests 01-03, 07, 08 and 10-14 start straight away.
  5. Launch mix: about 32 `launch execute`, 3 `review`, 1 `resume`. The repeated "go" is mostly the controller-side paste, plus resume and gate launches.
- **Paste evidence:** 33:294-298 (`Say "go" for row 1` → user pastes the row), 40:215, 42:177, 54:363.
- **Tests:** `tools/tests/launch.test.ts` (15) and `launch-title.test.ts`. No test covers *Next sessions*, row numbering or reply mapping.

### Collisions
- **Shared single-line or whole-file writes, worst first:**

  | File | Writer | Hand merges (digest sessions) |
  |---|---|---|
  | `CLAUDE.md` `updated:` | `scripts/spec-bump.sh:60-67`, called from update.md:134 §7, handoff.md:19, review.md:325, prep.md:75/101; also bumped on every phase close (update.md:174) | ≈9: 01, 02, 07, 11, 24, 26, 40, 43, 48 |
  | `in-flight.md` | handoff.md:54-58, which overwrites the whole file | ≈4 |
  | `pr-opening.md` Spec state | prose: execute.md:117, handoff.md:20, update.md:175 | ≈2 |
  | `code-map.md` | append | 1 |
  | `progress.md` | tick, in place (`tools/phases/tick.ts:42-60`) | 1 |

- **Lines next to `updated:`.** `focus:` is written on main by `tools/focus/land.ts:45-51`. git also conflicts on adjacent lines.
- **`updated:` is only a sort key.** It is tie-break 5/6 in `board/rank.ts:17`, used in `portfolio/order.ts:10` and shown in the list column (`portfolio/render.ts:38`). The doctor checks its format only (`doctor/spec-meta.ts:6`). Nothing gates on it. Tests: `board-rank.test.ts:15`, `portfolio.test.ts:18-56`, `schedule.test.ts:118`.
- **`in-flight.md` holds per-phase state in one shared file.** CRM sessions already split it into `# Phase N` sections (digest 02:8) and kept both on merge, which contradicts handoff's "overwrite". Readers: `core/spec-state.ts:45`, `context/packs.ts:48,73,91-93`, `doctor/phases.ts:29-33`, `graph/suggest.ts:12`, resume.md:25, execute.md:28.
- **Publish** (`tools/publish/`) runs only when `docs: main` (`commands/publish-docs.ts:12`); the default is `branch`.
  - The snapshot (`snapshot.ts:44-69`) takes **every** changed `docs/specs/**` path since the base, not just the named spec.
  - It then runs `git merge-tree` (`publish.ts:45`). Exit 1 means refuse with "diverged on main … merge main first" (:23-24). There is no per-file strategy.
  - Projects on `docs: branch` hit the same lines as merge-main and PR conflicts instead.
- **Past decisions bind the fix.** `spec-loop-automation/ledger/gotcha-github-ignores-merge-union.md`: never fix a shared write with `merge=union`; remove the shared write (per-item files, or derive). `decision-publish-docs-snapshot-merge.md` explains snapshot + merge-tree + merge-back. The per-spec `INDEX.md` union rule assumed "one spec's sessions write it", which parallel sessions on one spec now break.
- **Tests:** `tests/publish.test.ts:9-166`, `snapshot.test.ts:6-112`, `publish-commands.test.ts`, `commit-onto.test.ts`, `push.test.ts`, `gitattributes.test.ts`. None covers two sessions on one spec.

### Start/close ritual
- **Stale version.** `${CLAUDE_SKILL_DIR}` expands at skill load to a versioned cache path (`~/.claude/plugins/cache/spec-driven-marketplace/spec-driven/<ver>/skills/spec`).
  - Sessions copy it into `S=…` and keep it for their whole life.
  - `~/.claude/plugins/installed_plugins.json` has 93 spec-driven entries, mostly project-scope installs keyed by worktree path and pinned to their first-open version; only 6 are on 2.41.0.
  - There is no `current` pointer in the cache.
  - 408 versioned-path hits in 30/71 digests; 3 sessions mixed two versions; the user ran `/reload-plugins` 3×.
  - `tools/tests/skill-wiring.test.ts:11-74` pins the `${CLAUDE_SKILL_DIR}` and `$CLAUDE_PLUGIN_ROOT` forms.
- **Subfolder "not found".** `tools/spec.ts:70` passes `process.cwd()`. `core/spec-folders.ts:15-31` globs `docs/specs/*/CLAUDE.md` relative to cwd. `scripts/spec-bump.sh:39-43` does the same.
  - Failures: `doctor`/`gates` say "no spec named", and `context` silently returns "".
  - The root pattern already exists in `board/load.ts:103` and `context/infer-spec.ts:8` (`--show-toplevel`).
  - Evidence: 8 digests, all with cwd inside a spec folder after a `cd`.
- **Pack overflow.** 50 saved packs in CRM tool-results: min 30,089, median 39,739, max 46,921 chars. The ≈30K floor is Claude Code's tool-output cap.
  - Largest sections: project lessons 17.7K (uncapped, `context/packs.ts:136-141`), phase entry 8.2K, ledger 6.3K, playbooks 4.1K (uncapped), code-map 3.1K.
  - Caps are at `packs.ts:29-32`.
  - 51 tool-results reads in 27 digests.
  - Mode files are also read by `cat` afterwards (55× in 39 digests; execute.md 20 KB).
- **Start chain** (execute.md §1):
  - `trees place` and `claim take` are tools, with prose branching on their output.
  - The bootstrap gate is prose; `spec.ts gates --name` only **prints** the checklist (`commands/gates.ts:9-30`, no spawn).
  - fetch/merge main isn't in §1. execute.md:161 says only "after merging main" run `gates.after-merge-main` (`playbook/settings.ts:29,55,72`).
  - No composite command exists. `launch` runs place only.
- **Close chain** (handoff.md:117-170):
  - tools: doctor, `publish-docs`/`push`, `claim release`, board;
  - prose: commit, completion block;
  - no composite command.
- **`board --json`.** `{ board } | { board: null, error }`, `version: 1`, `lanes.{focus,inFlight,ready,blocked,needsYou}` (`board/model.ts:134-156`).
  - SKILL.md:101,154 and list.md:25 document only `{ board }`.
  - Digests show 32 jq/python reads that guessed `.title`, `.tree` or top-level `ready`.

### Sync with main
- `publish/push.ts:8,37` computes `behind` (`HEAD..origin/<default>`), and `publish/render.ts:10` prints it.
- `workspaces/scan.ts:25` reads `%(ahead-behind:<base>)` for every branch, and `workspaces/classify.ts:4-5,33` parses it, but no consumer reads it.
- The board has no behind field (`PrCell`/`FlightRow`, `board/model.ts:20-42`), and pr-status reports none.
- Digests: `git fetch` 90 hits in 45 files, merge origin/main 31 in 25, `merge-base` 40 in 31. Anton retyped "merge the latest remote main … including the flyway migration".

### Reports and questions
- **About 8 report templates, none leading with impact, merge effect or what's left, and none glossing labels:**
  - handoff.md:156-172 (bookkeeping only)
  - update.md:145-168
  - execute.md:146 ("2–3 sentences: what shipped, what's next", the closest)
  - review.md:339-350
  - SKILL.md:155-163 *Next sessions*
  - resume.md:30-70
  - status.md:27,73 (tool-rendered by `tools/context/status-table.ts`; nothing allowed after it, :86)
  - prep lock report
- **Only plain-words prior art:** spec-loop-automation phase 9. It added the per-phase **Outcome** line (create.md:282,298), the status **Delivers** cell and PR bodies that lead with Outcomes (execute.md:157), pinned by `skill-wiring.test.ts:116-120`, with the decision "no doctor check — nudge". It did not reach chat reports.
- **Good defaults that ask today:**
  - SKILL.md:163 / handoff.md:176 "on approval"
  - resume.md Stage A
  - execute.md:22 (offers the top row)
  - execute.md:163,165 (merge method; pr-babysit owns this)
  - update.md:22 (which in-progress phase; the claim or tree says)
  - update.md:182 (promotion)
  - legacy `[y/N]` offers
  - create.md interactive asks
  - create.md:374-375
  - prep.md:285 (soft offer)
  - code-quality-review offer to save
- **Real forks to keep:**
  - prep brief stop
  - review.md:216-224
  - claim `--take-over`
  - merge is the user's call
  - create phasing
  - deploy confirmation
  - task-phase human items
- **Prior art for "apply and list".** review.md:214 ("resolved by me"), review.md:347 (`Forks:` line), prep.md:316 (`recommended, unconfirmed`), phase-preflight:152 ("do not ask taste questions"). It is not a shared SKILL.md rule.
- **Digest exemplar:** 55:220-280. The phase report led with mechanism ("two studios can now share a double"), Anton then asked what that means and what the impact is, and the agent asked "Want me to launch phase 11?" twice.

## Reuse
- **Launch.** `sessionLaunch`, `launchCommand`, the injected `PlaceFn`/`Runner` and the `launch.test.ts` harness. `rowKey`, `treeBusy` and `target` from `board --json`. `isPhaseId`/`normalizePhaseHint`.
- **Collisions.** `commitOnto`, the publish rebuild-on-non-fast-forward loop and the snapshot base logic. `frontmatter-patch.ts` (`setFrontmatterLine`), `core/apply-edits.ts`, the doctor checks.
- **Ritual.** The `trees place`, `claim take|release`, `push`, `publish-docs`, `doctor` and `gates` commands. The `--show-toplevel` root pattern (`board/load.ts:103`). The pack's `withinBudget` (`packs.ts:110`). The `BOARD_VERSION` model.
- **Sync.** `push.ts` behind count, `workspaces/scan.ts` ahead-behind, the `gates.after-merge-main` setting.
- **Reports.** The phase Outcome line as the source of "impact". Review's "resolved by me" and `Forks:` pattern for "say if wrong".

## Neighbors
- **spec-loop-automation** (open; only phase 10, CRM adoption, left). It shares `tools/spec.ts`, `core/spec-folders.ts`, `commands/gates.ts` and SKILL.md. Relation: **related**. This spec extends its phase 9 (plain words) from phase files to chat reports, and reuses its gates/settings/publish. Not `needs`: phase 10 is CRM-side.
- **pr-babysit** (prep, recon locked). Already declared `related` in the stub.
  - It owns the PR-ready question, the merge decision, the merge-method policy at execute.md:163, and the end-of-session report's PR-state lines (`PR:` / `Merged:`).
  - Its wave 1 says self-driving-loop owns sync-with-main.
  - This spec owns the general report shape and leaves PR wording to it.
  - No `needs` either way yet; revisit if pr-babysit's babysit loop calls our sync step.
- **spec-board, active-work-view, spec-spin-off** (finished). They built today's *Next sessions*, launch and FOCUS. No relation to declare; they are prior art only.

## Still open
1. **Can gates run?** Gates only print checklists. "Sync in one step including after-sync checks" needs to know whether a project's gate items are runnable commands (CRM's `gates.md`), and how 2.41.0's `gates.per-commit` runs them.
2. **Stale version fix.** The pinning is Claude Code behaviour (per-worktree project installs). What can the plugin control: a version-independent entry path, a hook rewriting stale cache paths (`~/.claude/hooks` already rewrites paths), or does `$CLAUDE_PLUGIN_ROOT` in hooks track the current install?
3. **Collision fix inputs.** Can `updated:` be derived (git log per spec folder) at board/list cost? How do readers handle per-phase in-flight files? Can the `pr-opening.md` Spec state be derived rather than written?
4. **pr-babysit boundary.** What pr-babysit plans for gate rows, launch, the handoff report and pr-opening, so the gate/prep/create launch targets and report shape don't overlap.
5. **Reply → row mapping.** Is the board's ready order stable between print and reply (a fetch in between), and where could a printed row list live (session-scoped)?
