---
needs: [1, 2]
same-files-as: [3]
pr: C
---

# Phase 5 — Idle claims and shipped focus

**Goal:** Needs you lists a live claim whose session has been idle for 2+ days (`claim idle 3d →
resume or release`) and a focus spec that has shipped (`shipped → drop from focus`).

**Outcome:** A forgotten tab can no longer hold a phase unnoticed, and the focus set doesn't silt up
with finished work · small · risk: noise from long-running but legitimate idle claims (2-day threshold).

**Files to touch:**
- `skills/spec/tools/board/model.ts` (`idle-claim`, `focus-shipped` kinds), `board/attention.ts`, `board/render.ts` (`attentionCells`)
- tests: `board-claims.test.ts` (idle-claim, next to the remote-claim case), `board-attention.test.ts`, `board-render.test.ts` or `board-render-focus.test.ts`
- `skills/spec/list.md`, `README.md`

## Implementation guidance

`technical.md` → *Attention*. `idleClaims`: local claim, `claimStatus` live, its session's `status` is
not `busy`, and `olderThanDays(session.updatedAt, now, IDLE_CLAIM_DAYS)`. A `shell` session counts as
idle for this rule only (its turn is over; the background shell is a local stack, not work). Sessions
unreadable → no idle rows (fail safe, `gotcha-claude-session-files-are-undocumented`).
`shippedFocus`: every focus entry whose spec node `isFinished`.

Name it *idle*, never *stale*: `isStale` means "safe to take over", and an idle live claim is not.

## Deliverables

- [ ] `idle-claim` attention kind with `IDLE_CLAIM_DAYS = 2`; boundary and unreadable-sessions tests
- [ ] `focus-shipped` attention kind; test
- [ ] Render lines per `design.md` → *Copy*; tests
- [ ] `list.md` / `README.md`: what the two rows mean and what Claude does on "release it" / "drop it"

## Phase-local notes

- Real case to smoke against: CRM `recurring-series-lifecycle-clarity` phase 7, idle since 2026-10-04 with a live claim.
