---
needs: [10, 10a]
pr: J
---

# Phase 10aa — The page reads right for a whole board

**Goal:** the page reads right with a whole board on it: Academy's 99 cards, most of them done, beside CRM's specs.

**Outcome:** Anton can check the Academy view and Taras can work from it: *Now* lists only what really waits on someone, and a card's page says where it stands and why · half a day · the risk is hiding a real "done, but still open" warning, so the rule changes only for covers that name no phases

**Files to touch:**
- `skills/spec/tools/cards/attention.ts` — the done-but-open rule
- `skills/spec/tools/page/` — `model.ts`, `render-card.ts`, `render-now.ts`, `people.ts`, `plan-rows.ts`, `styles.ts`
- their tests in `skills/spec/tools/tests/`

## Implementation guidance

Found by a Chrome DevTools check of CRM's page right after phase 11's import (2026-11-13, Anton: "Design fixes
must come before opening the PR"). What it showed, in the order of the deliverables:

1. *Now* had ~23 rows like "Card c30 is done, but mindbody-pass-fixes-reach-crm#4 is open → check it". Academy's done
   cards cover a whole spec (its note said `Spec: <name>`), and a closed card can't be edited, so the data can't be
   fixed: the rule must skip a done card whose cover names no phases. A cover with phases still flags.
2. `#c30` (done) shows a priority dash, its tags, `promised`, "no deadline yet" and the covering phases, but not
   that it is done, its `closed` (at, by, why) or its note. Academy keeps all its context in notes (spec, what's left,
   `| Items: …`). Show the note under the quote and the end state at the top; a done card shows no deadline chip.
3. c32, c33 and c102 each cover the whole of one-attendance-engine and each draw its 30+ phase squares, in *Moving*
   and in the Plan panels. For a whole-spec cover show the spec's progress bar (done / moving / to do) instead.
4. The yellow *need you* box showed three chips "Taras 8", "Taras 5", "Taras 8" (several spellings of one person not
   merged; match with `samePerson`, as owners are), and at 1440 px the third overlapped the box's edge.
5. The tab title and box said 107, while the box showed 3 rows and "125 more" (128).
6. Plan showed tag summaries of 20 lines (Pass sync) and P0 rows for tags no card carries (Card fee: "no cards yet").

Check against CRM's board (`spec.ts page` from `~/IdeaProjects/crm`) with the chrome-devtools MCP at 1440×900 and
390×844; save the screenshots under `research/phase-10aa/`.

## Deliverables

- [x] A done card covering a whole spec isn't flagged 'done, but <phase> is open'; only a cover that names phases is
- [x] A card's page shows its status (done or dropped, with when, who and why) and its note
- [x] A card covering a whole spec shows that spec's progress, not a square for each of its phases
- [x] Now shows one chip per person (people matched as owners are), and the chips never overlap
- [x] The count on Now matches its rows: the rows shown plus 'N more' add up to it
- [x] Plan clamps a long tag summary to three lines, and hides a tag no open or done card carries
- [x] Checked in a real browser at 1440 and 390 px on CRM's board with Academy's cards: screenshots in the phase's research — docs/specs/live-board/research/phase-10aa/2026-11-13-10aa-browser-check.md + 7 screenshots
