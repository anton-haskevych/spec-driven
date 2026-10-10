---
needs: []
pr: A
---

# Phase 1 — Pick by number

**Goal:** A bare row number (or several) after *Next sessions* launches those rows with the right sub-command, a freshly created spec's first row is its review, and the launched session starts work without asking "go" unless preflight raised a real fork.

**Outcome:** You type "1" (or "1 3") instead of pasting a row and saying "go"; after a spec is written, "1" starts its review; the new tab just starts · small, prose plus one board field · risk: a number meant for another question launches a session — a number only launches when the last numbered list was *Next sessions*.

**Files to touch:**
- `skills/spec/SKILL.md` (*Next sessions*, :32)
- `skills/spec/execute.md` (§3 preflight take-back, :22), `tools/commands/context.ts` (`OFFER_TOP_READY`)
- `skills/phase-preflight/SKILL.md` (*Decisions for you* split)
- `skills/spec/create.md` (*After writing*), `list.md:29`, `handoff.md` (:174-176)
- `skills/spec/tools/board/model.ts`, `board/lanes.ts`, `board/render.ts`
- `skills/spec/tools/tests/skill-wiring.test.ts`, `context.test.ts`, board tests

## Implementation guidance

technical.md → Phase 1. Write the reply rule once in SKILL.md *Next sessions*; handoff, review, create and list point there. A number answers the most recent numbered list; it launches only when that list is *Next sessions*, and with no block in view the session reprints it rather than reading the board. Each row launches as `<row.next> <spec> [<phase>]`.

The "go again" fix is preflight's split: *Defaults applied* (execute applies and lists them under `Say if wrong:`) vs *Forks for you* (execute stops). Don't auto-apply a decision just because it has a recommendation — every preflight decision has one.

Review-after-create is Anton's rule (ledger `decision-review-follows-create`): the board yields one `review` row for a spec with phases, no `reviews/` and nothing ticked; create's block puts it at 1.

pr-babysit owns the one-list rule (its design.md:47-48) and rewrites handoff and execute §10 in its phase 7. Whichever lands second merges main and keeps both; don't write a second copy of the rule.

## Deliverables

- [ ] SKILL.md *Next sessions*: row fields named in step 1, `Reply with row numbers to launch.`, reply rule (most recent list, `<row.next>`, reprint when no block), "after the PR question is answered"; :32 updated; list.md and handoff.md point at it; wiring pins
- [ ] Board: `title` on ready rows, `next: review` for unreviewed specs, `BOARD_VERSION` bump; tests
- [ ] create.md *After writing*: review row at 1, no confirm/offer asks; wiring pin
- [ ] phase-preflight *Defaults applied* / *Forks for you*; execute.md §3 applies the first and stops on the second; execute :22 and `OFFER_TOP_READY` apply the top row; tests

## Phase-local notes

Lesson `gotcha-execute-section-0-is-skipped-on-the-resume-path`: anything every execute session must do goes in §1 or later, never §0.
