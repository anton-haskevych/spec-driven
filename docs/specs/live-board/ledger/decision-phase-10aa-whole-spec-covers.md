---
kind: decision
applies-to: [phase 10aa, 11, 12]
created: 2026-11-13T15:46:17-08:00
---

# A whole-spec cover says where the work lives; a phase cover is the promise

A card's `coveredBy` ref without `#phases` (Academy's import writes one per done card, from its note's
`Spec: <name>`) names where the work lives, not that every phase of that spec was promised.

- `cardAttention` (`cards/attention.ts`): `card-open` ("done, but <phase> is open") counts only phases from
  refs that name phases. `card-close` still counts whole-spec covers: an open card whose whole spec shipped
  is still worth closing.
- The page: `PageCard.whole` lists the specs covered whole; `coverStrip` (`page/marks.ts`) draws one bar per
  whole spec (`specBar`: done/moving/to do from the squares, `done/total`) and squares only for named
  phases. The card sheet folds the phase lines under the bar. A spec covered both ways counts as whole.
- Now's box lists only the viewer's rows, so its count = rows shown + "N more"; other people's rows fold
  under "Waiting on others". `needs.others` merges spellings with `samePerson`, first spelling wins.
- `PageCard.closed` (at, by, why) for done and dropped replaced `closedAt`; `note` over 280 characters
  opens from four clamped lines. Plan drops a tag with no live (open or done) card.

Why: CRM's page after phase 11's import had 22 unfixable done-but-open rows (a closed card can't be edited)
and drew 30–49 squares per row. Screenshots: `research/phase-10aa/`.
