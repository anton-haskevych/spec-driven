---
date: 2026-10-07
spec-phase-at-review: Phase 1 — Groundwork (no phase started)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: focus-storage-and-landing
---

# Review — focus-storage-and-landing

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

All five reviewers returned **fix-then-proceed**. They agree the board side is sound: the FOCUS lane is
built from lanes that already exist, the JSON change is additive, and the phase-1 extractions are
justified.

The spec's weak point is the **focus set as shared state**. It was stored like a spec doc (`_focus/`
files written in the checkout) and landed like one (`publish-docs`), but it behaves like a claim: one
truth for the whole team, read from the base. Four reviewers found the consequences independently:
- `drop` can never land, because `publish-docs` skips deletions.
- `docs: branch` projects have no way to land a focus edit at all.
- The writer computes ranks from a checkout that may be days stale.
- The folder needs its own defenses against dangling entries (unknown spec, branch-only, shipped → drop).

The second cluster is **session attribution**:
- The session reader covers every repo on the machine.
- The main checkout is always "live", so rule 2 credits every main-checkout session to whichever spec
  main has uncommitted edits for.
- The rules were ordered tree before name.

Both clusters are fixed in the spec. The user resolved the two forks below. Everything else is
mechanism, decided here.

## Forks put to the user

1. **Where the focus rank lives.**
   - (a) `_focus/<spec>.md`, as specced.
   - (b) A `focus:` field in the spec's own `CLAUDE.md`, with the documented `owner:` key for whose it is.

   Prior-art showed that decision 2's three reasons for rejecting (b) don't separate the options:
   - Both use N files.
   - `updated:` and an appended key are distant hunks, so there's no conflict.
   - Branch edits reach neither.

   (b) removes the loader, two doctor files, the hook regex, `Mainline.focus`, the `unknown` and
   `branch-only` now-kinds, the `focus-shipped` kind and the handoff drop step.
   **Answer: (b), field in CLAUDE.md.** → `ledger/decision-focus-rank-in-spec-meta.md`
2. **How focus edits land.**
   - (a) Straight onto `origin/<default>`: one-file commit, pin/commit/push with retry, any checkout,
     any docs mode, refused if main rejects the push.
   - (b) Only via `publish-docs`, which needs `docs: main` and a tombstone for drops.

   **Answer: (a), straight to main.** → `ledger/decision-focus-writes-land-on-default-branch.md`

## Resolved by the synthesizer

- **Rank format: any finite number ≥ 0, midpoint inserts, never renumber.** Every write touches one
  file. That matters more now that a renumber would rewrite other specs' `CLAUDE.md`. (CQ F5)
- **Shipped = finished on base and no open linked PR.** Until then the row stays, with `now: merging #n`.
  There's no drop step: a stale `focus:` on a done spec is harmless. (PE F3)
- **Attribution order:** claim → launch title → non-main worktree touching exactly one *focus* spec.
  Sessions are first limited to this repo's worktrees. joins.ts is untouched: in-flight rows are
  phase-keyed and already pick one session per row, and unifying the two resolvers would change
  in-flight output, which this spec promises not to touch. (PE F2 partially accepted)
- **`other sessions`** = this repo's sessions not on any focus row, including sessions attributed to a
  non-focus spec. It is emitted only when the focus set is non-empty. (CQ F4, ADV F6)
- **`--who` filters the model** (`focusFor` in `board/people.ts`, applied before JSON and text).
  `Board.me` is additive. (PE F5, CQ F2, IA F10)
- **Focus ranks before priority in ready rows.** That ordering is the point of the feature. Focus is
  not `p1`: CRM has 22 `p1` specs, with no total order and no per-person view. Recorded as a decision
  row, with no doctor coupling. (PrA F2)
- **Idle-claim copy:** `→ switch to <session> or take it over`. `claim release` frees only the caller's
  own claims, and take-over needs the user's word. (IA F5)
- **Idle-claim is board-wide** (the brief asks for it), so the byte-identical metric now excludes it.
  (IA F8, ADV F6)
- **`me`** is one `git var` in `loadBoard`, not in `loadBoardInputs`. `unknown` never matches anyone. (PE F6, IA F7, ADV F8)

## Findings

Signal: C = consensus, U = unique-insight. V = verified in code by the synthesizer, I = inferred / not re-checked.

| # | Sev | Signal | Personas | V | Finding → applied change |
|---|---|---|---|---|---|
| 1 | critical | C | PE F1, IA F1+F3, ADV F3+F4+F11, PrA F4+F8 | V | Focus writes can't land. `publish/snapshot.ts:40-41` drops `D`, `commands/publish-docs.ts:12` refuses unless `docs: main`, the `DEFAULT_SETTINGS.docs` default is `branch`, `EditPlan` has no deletes (`core/apply-edits.ts:15-18`), and the writer reads the cwd. → Fork 2: base-first writer straight to the default branch, which refuses a spec not on the base. |
| 2 | high | U (fork) | PrA F1, F3, F8 | V | `_focus/` folder vs. a `CLAUDE.md` field. `setFrontmatterLine` appends before the closing fence (`core/frontmatter-patch.ts:13`), and `SpecMeta` already carries priority/due. → Fork 1: `focus:` + `owner:` in spec meta. |
| 3 | high | C | IA F2, ADV F2 | V | `loadLiveSessions` reads every session on the machine (`sessions/live.ts:42-56`), so other repos leak into `other sessions` and name matching. → Limit to `ownerOf(cwd, every git worktree path)`, the paths `claimContext` already lists (`claims/held.ts:12-13`). |
| 4 | high | C | IA F4, ADV F1 | V | The main checkout is always live (`workspaces/classify.ts:51`), so rule 2 credits every main-checkout session to that spec. → Rule 3 (tree) skips `isMain`. |
| 5 | medium | C | PE F3 | I | `docs: main` publishes the last tick before the PR merges, so FOCUS would hide unmerged work. → Shipped = finished and no open linked PR, with `now: merging #n`. |
| 6 | medium | C | PE F7, CQ F1, PrA F7 | V | The launch title is built in `launch/command-line.ts:26-27` but parsed in board. → `launch/title.ts` `launchTitle`/`parseLaunchTitle` with a round-trip test (phase 1). `FocusSession` carries `sub`/`phase`. |
| 7 | medium | C | PE F5, CQ F2, IA F10, ADV F13 | V | `--who` filters in the renderer, skips JSON and can't resolve `me` (`Board` has no `me`). → `focusFor` on the model, `Board.me`, the header shown in samples, and an empty set prints `FOCUS\n  none`. |
| 8 | medium | C | CQ F3, PrA F6 | V | The PrRow→PrCell mapper and the link join are private in `joins.ts:60-74`, and the mapper's name collides with `cells.prCell`. → Extraction #7: export `toPrCell` and `linkedPrs`. |
| 9 | medium | U | ADV F7 | I | Tree before name credits reused trees to the wrong spec. → Order: claim → name → tree. |
| 10 | medium | C | PE F4 | I | The tree rule rarely fires after a publish. → The limit is stated in design; the name rule is primary. |
| 11 | medium | U | CQ F4 | V | `focusRows` takes redundant params, and "other" is defined two ways. → `focusLane(lanes, inputs, now): { rows, otherSessions }`; `attributeSessions` → `{ bySpec, unattributed }`. |
| 12 | medium | U | CQ F5 | I | Integer renumbering is complex and creates a conflict surface. → Numeric ranks, midpoint, no renumber. |
| 13 | medium | U | IA F6 | V | `rankReady` sees only `ReadyRow` (`board/rank.ts:9`), and agents read the top ready row (`execute.md`, `commands/context.ts`). → `ReadyRow.focus?: number`; consumers listed. |
| 14 | medium | U | ADV F5 | V | Paused specs are off every lane (`board/lanes.ts:40`); `abandoned` counts as finished (`graph/nodes.ts:61`); `idle` kind undefined. → `now: paused`, `idle` deleted, abandoned/good-enough hidden. |
| 15 | medium | C | IA F8, ADV F6 | I | Byte-identical promise broken by idle-claim, and the test proves nothing via a factory board. → Metric narrowed; golden test is `renderBoard(buildBoard(inputs))` vs a 2.36.7 capture. |
| 16 | medium | U | ADV F8 | I | Prefix matching isn't transitive (anton/antonio), and `unknown` matches `unknown`. → Deterministic bucketing: me by `samePerson(me)`, others by exact normalized name; `unknown` never matches; `isolatedRunner` for the `me` test. |
| 17 | medium | U | ADV F9 | I | Who cells list merged PRs; there's no slot for author-less PRs; teammate links on branches stay invisible. → Open PRs only, an unattributed slot, the PR C smoke reworded. |
| 18 | medium | U | ADV F10 | V | Idle-claim gives one row per claim, falls back to `startedAt`, and has no on-board filter (`attention.ts:46` has one for remote). → One row per session listing its phases; skip when `updatedAt` was missing; the same on-board filter. |
| 19 | medium | U | IA F5 | V | "release" has no tool path (`commands/claim.ts:52,178`, own `sessionId` only). → Copy `switch to <session> or take it over`. |
| 20 | low | C | PE F6, IA F7 | V | `readHolder` is only called from `commands/claim.ts:89`. → `me` = one `git var` in `loadBoard`. |
| 21 | low | U | CQ F6 | V | `oldRemoteClaims` uses strict `<` (`attention.ts:46`). → `olderThanDays(then: Date, now: Date, days)` strict; tests at N days (false) and N days + 1 ms (true). |
| 22 | low | U | CQ F7 | V | `list.ts:20` routes any args to the table. → A pure `listRoute(args)`; unknown `--` flags → usage. |
| 23 | low | U | CQ F8 | I | Claim/session factories belong in `tests/factories.ts`. → Moved; migrate only where defaults fit. |
| 24 | low | C | CQ F9, PrA F5 | V | `phaseProgress` is too small; `specRow` already computes progress/overdue (`portfolio/rows.ts:30-38`). → Extraction #6 becomes `specSummary(node, today)` split out of `portfolio/rows.ts`; `status-table.ts` untouched. |
| 25 | low | U | IA F9 | I | Phases 1 and 2 both edit `tests/board-factories.ts`. → Moot: phase 2 no longer adds `BoardInputs.focus`. |
| 26 | low | U | CQ F10 | I | `FocusSession.mine` is always true; kind→copy mapping missing. → Dropped; table added. |
| 27 | low | U | ADV F12 | I | Rank edge cases: self-successor, ties, malformed values. → The moved entry is removed before finding the successor; ties take the midpoint to the next distinct rank; a malformed `focus:` is a doctor error and the writer overwrites it. |

## Rejected or unverified

- **PE F2 (one resolver for joins and FOCUS)**: only partly applied. Rewiring `joins.ts` would change
  in-flight output, which the spec promises to leave alone. FOCUS uses its own resolver with
  the order and repo scoping above. The divergence is documented in design.
- **CQ F10 `FOCUS_DIR` exemplar**: superseded by fork 1, since there's no folder.
- **IA F1 tombstone, PE F1 fallback, PrA F8 `EditPlan.deletes`**: superseded by forks 1 and 2.
  A drop removes one frontmatter line on main.
- **ADV F4 (extend publish-docs to carry `_focus/` deletions)**: superseded by fork 2.
- **ADV F11 (branch-only spec in focus)**: superseded. The base-first writer refuses a spec that isn't on the base.
- **PrA F2 doctor warning when a focus spec isn't p1**: rejected. Focus and priority are separate
  axes, and a warning would push everyone to mark focus specs p1, recreating the 22-p1 problem.
