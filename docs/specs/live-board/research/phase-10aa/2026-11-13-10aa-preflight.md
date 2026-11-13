# Phase 10aa preflight (2026-11-13)

Self-scaled: six small files, all read in recon. House rules (principles.md, the page's own split: model
builds plain data, `render-*` are pure string functions, `marks.ts` holds shared marks) outrank canon.

## Findings that change the plan

1. **The count mismatch is a mixing bug, not an off-by-one.** `render-now.ts:15` folds *everyone's* rows under
   a count that is only the viewer's (`needs.ts:42` `mine`). CRM: 108 mine + 21 others = 129 rows. Fix: the
   box lists the viewer's rows (3 + "N more" = mine); other people's rows go in their own fold below it.
2. **Whole-spec vs phase cover must be in the model.** `pageCard` (`cards.ts:22`) flattens every ref into
   `phases`, losing which refs named phases. Add `whole: string[]` (specs covered whole) to `PageCard`; the
   renderers choose bar vs squares from it. A spec covered both whole and by phases counts as whole.
3. **`closedAt` is too thin.** `cards.ts:45` keeps only `at`, only for done. Replace with `closed` (at, by,
   why) for done and dropped, plus `note`; `model.ts:186` reads `closed.at` for done cards.
4. **`others` must merge spellings at build time** (`needs.ts:44`), not in render: the count per person is data.
   Key by the first spelling `samePerson` matches; the chip name comes from `personOf` as today.

## Canon against 10aa

| Rule | Verdict | Consequence |
|---|---|---|
| Clean Code: one thing per function | Bites | `cardAttention` gains a `namedPhases` filter, not a flag argument |
| Clean Code: no flag args | Bites | render chooses bar/squares from `card.whole`, not a boolean param on `strip` |
| Clean Arch / Dependency Rule | Inert | all pure, same layer |
| SRP | Bites | progress counts per whole spec: one helper in `marks.ts` (`specCounts`), reused by Now, Plan, card sheet |
| OCP/LSP/ISP/DIP | Inert | |
| DDD | Inert | card statuses already modelled (`CardEnd`) |

## Amendments

1. `cardAttention`: the `card-open` branch counts only phases from refs with `#phases`; `card-close` unchanged.
2. `PageCard`: `+whole`, `+note`, `closed?: CardEnd` replaces `closedAt`.
3. `needRows`: `others` merged with `samePerson`; render: mine rows in the box, others in a folded group.
4. `planRows`: skip a tag with no live (open or done) card; CSS clamps `.pn > span` to three lines.
5. `.count small` wraps.

## Defaults applied

- Card sheet: end state as one line under the title ("Done Nov 3 by Anton: <why>"), note under the quote;
  no deadline chip on a done or dropped card.
- Card sheet: a whole-spec cover shows the bar and counts; its phase lines fold under it.
- Others' rows on Now fold as "Waiting on others · N", closed by default.

## Forks for you

None.
