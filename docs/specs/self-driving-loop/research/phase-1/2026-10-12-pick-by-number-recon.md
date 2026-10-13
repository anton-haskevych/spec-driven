# Phase 1 recon — pick by number (2026-10-12)

One wave, two explorers (board seam, prose seam). Line numbers at 6185ddf + merge.

## Seam — board

- `board/model.ts:7` `BOARD_VERSION = 1`; `:49` `NextStep = "prep" | "create" | "execute"` (also `FocusNow.step` :91); `ReadyRow` :51-70 has no title.
- `board/lanes.ts:75-80` `specLanes` dispatches stage → `stageLanes` (:116-133), else `phaseLanes` (:82-94); `branchOnlyLanes` (:104-114) runs `phaseLanes` on a worktree's state. `phaseRow` :135-154 already holds `phase` (`PhaseState.name` is the parsed title, `core/spec-state.ts:13`).
- Spec title: no extractor. `graph/nodes.ts:36` `loadNode` already parses CLAUDE.md; the H1 after frontmatter is the title.
- `board/render.ts:13` `NEXT_COMMAND: Record<ReadyRow["next"], string>` — the one compile-time exhaustive spot. `render-focus.ts:43`, `focus.ts:105`, `rank.ts` are generic.
- Reviews: the base archive (`mainline/base-cache.ts:6` READ_SET) carries only `docs/specs/*/*.md` and `phases/**`, so `reviews/` is absent; cache dirs are keyed by sha alone (:12-16), so a READ_SET change needs a key change or old caches stay blind. Worktree views (`workspaces/views.ts:13-15`) load from disk and see `reviews/`.
- `oversee-crew.md:75-76`: the crew launches only `next: "execute"` rows; review rows are skipped there.

## Seam — prose

- SKILL.md :32 ("execute offers the board's top ready row and starts it on a yes"), *Next sessions* :154-170 (step 3 "On approval", launches `execute` only).
- execute.md :22 offer-and-stop; §3 take-back :96 says nothing about *Decisions for you*; §10 :163 already carries pr-babysit's one-list rule.
- create.md *After writing* :371-376 (confirm / offer / first ready phase at 1).
- list.md:29 restates step 3 with `launch execute`; handoff.md :184-187 points at *Next sessions* and §10; review.md:350 puts the first ready phase at 1.
- phase-preflight/SKILL.md :137-140 *Decisions for you* ("Give a recommendation for each").
- `commands/context.ts:30` `OFFER_TOP_READY`, used :59; pinned by `tests/context.test.ts:281-286`.

## Reuse

- Review row = `stageLanes` row with `next: "review"` (same blockers, target, ranking).
- Row title for phase rows = `phase.name`; for stage/review rows the spec title (new optional `SpecNode.title`, fallback to the name).
- Reviewed flag computed where the state is loaded from disk (`loadSpecState`), not in `specStateFrom` (it has no directory listing; also used by `phases/validate.ts` and tests).

## Testing-issue estimate

- Fixtures model unreviewed specs (`board-factories.ts` `specFixture`, `board-command.test.ts` real repo). The flag must default to "reviewed" (optional field, only disk loads set it) or a dozen board tests flip; `board-command.test.ts` real-git spec `a` needs a `reviews/` file or an explicit expectation.
- `board-command.test.ts:35` hard-codes `version` 1.
- Text goldens (`board-render.test.ts`, `board-no-focus-golden.test.ts`) stay as long as no title column is rendered.
- Files under the cap: lanes.ts 173, model.ts 161, render.ts 114, base-cache.ts 74.
- `skill-wiring.test.ts` has no pins on this prose yet; pins are new.
