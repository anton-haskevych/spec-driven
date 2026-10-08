---
needs: [1, 3]
same-files-as: [4]
pr: C
---

# Phase 5 — Idle claims

**Goal:** Needs you lists each session that holds a live claim and has been idle for 2+ days, as
`claim idle 3d · <spec> · <phases> → switch to <session> or take it over`.

**Outcome:** A forgotten tab can no longer hold a phase unnoticed · small · risk: noise from idle claims
that are long-running but legitimate (2-day threshold).

The file name keeps its original slug. "Shipped focus" was removed by the 2026-10-07 review: with
`focus:` in spec meta there is nothing to drop, and FOCUS shows `merging #n` until the PR merges.

**Files to touch:**
- `skills/spec/tools/board/model.ts` (`idle-claim` kind), `board/attention.ts`, `board/render.ts` (`attentionCells`)
- tests: `board-claims.test.ts` (idle-claim, next to the remote-claim case), `board-attention.test.ts`, `board-render.test.ts`
- `skills/spec/list.md`, `README.md`

## Implementation guidance

See `technical.md` → *Attention*. `idleClaims` keeps a local claim only when all of these hold:
- `claimStatus` is live
- its row is on the board (the same `shown` filter `oldRemoteClaims` uses)
- its session's `status` is not `busy`. A `shell` session counts as idle for this rule only: its turn
  is over, and the background shell is a local stack, not work.
- its `updatedAt` was read from the file. Phase 3's flag marks a `startedAt` fallback; skip those.
- `olderThanDays(session.updatedAt, now, IDLE_CLAIM_DAYS)`

Group the result to one row per session, listing its phases. When sessions are unreadable, emit no
rows (fail safe, `gotcha-claude-session-files-are-undocumented`). A session whose status the reader
doesn't know maps to `busy` and is never flagged; that's accepted.

Name it *idle*, never *stale*: `isStale` means "safe to take over", and an idle live claim is not that.
The copy names the two actions that exist. `claim release` frees only the caller's own claims, and
`--take-over` runs only on the user's word.

This row is board-wide, whether or not a focus set exists (design decision 14).

## Deliverables

- [ ] `idle-claim` attention kind with `IDLE_CLAIM_DAYS = 2`; one row per session; tests for the boundary, unreadable sessions, the `startedAt` fallback, an off-board row and `shell`
- [ ] Render line per `design.md` → *Copy*; tests
- [ ] `list.md` / `README.md`: what the row means; "switch to it" → name the tab; "take it over" → `claim take … --take-over` on the user's word only

## Phase-local notes

- Real case to smoke against: CRM `recurring-series-lifecycle-clarity` phase 7, idle since 2026-10-04 with a live claim.
