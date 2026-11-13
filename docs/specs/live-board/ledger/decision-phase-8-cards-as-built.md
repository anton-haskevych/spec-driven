---
kind: decision
applies-to: [phase 8+]
created: 2026-11-13T02:33:15-08:00
---

# Cards, sources and tags as phase 8 built them (deliverables 1–5)

What later sessions build on (paths under `skills/spec/tools/`):

- **Documents** (`cards/`): `card-doc.ts` (status open|doing|done|dropped, commitment promised|asked|idea,
  priority on `PRIORITIES` = p0–p3, `coveredBy` refs, `closed: { at, by, why }` exactly when done or
  dropped, unknown fields refused), `source-doc.ts` (role origin|mention|evidence, Academy `occurredAt` rule),
  `tag-doc.ts` (kind customer|area|other). No `tasks` field yet. Paths in `cards/paths.ts`; source ids are
  letters a…z, aa…; `plan/kinds.ts` has a row for each. `cards/contact.ts`: email, or 10+ digits in one run
  that holds no YYYY-MM-DD, is "contact details" in a title, note, quote or closed.why.
- **Plans** are pure `(view) → CardEdit` wrapped by `cardPlan` (`cards/plans.ts`, `cover.ts`, `close.ts`,
  `tags.ts`). The card number is `nextCardId(view)`: max over every `cards/` path, unreadable ones too.
- **Sending.** `card add` = `boardBase` (switch on the default branch, refuses offline) + direct
  `writeRecord`. Every other card write is one outbox intent `card` with `action` update | source | cover |
  close | tag | tag-set (`cards/intents.ts`, runner in `plan/intents.ts`), dry-run first on this machine's read
  (`commands/card/send.ts` `sendCardIntent`, whose `intentAt(view, plans)` may refuse). Not spec-scoped: no
  `withPlanNotice`, no upgrade on touch.
- **People.** `board.people` in settings; `cards/people.ts` `resolveAssignee` refuses an empty list, no match
  or two matches. `card update` reads people from the checkout, `card add` from the default branch.
- **Readers.** `cards/read.ts` (`readCards`, `readSources`, `originOf`), `cards/list.ts` (`cardRows`,
  `groupByTag`, `cardLine`, `quoteLine`), `cards/cover.ts` `coveringCards` + `coverLines` (the pack's
  `Card c1 (p0 · asked) covers phase 2: …` lines, added in `commands/context.ts` `withBoardLines` for any spec
  when a record exists).
- **Checks.** `cards/check.ts` `cardProblems(view, specs?)`: per-document problems, a source's card exists,
  exactly one origin, an open card's cover still resolves. The doctor runs it project-wide
  (`doctor/cards.ts`, named `refs/spec-board/record/<path>`); `card check` runs it with a fetch.
- **Board.** `board/card-rows.ts` adds needs-you rows `card-close` (every covering phase finished: a joined
  phase merged/deployed/done by `phaseStage`, a file phase ticked on the default branch) and `card-open`
  (a done card whose covering phase isn't).
- **Not built yet:** deliverables 6–9 (ideas as cards, `_backlog` files on touch, list shows both, prep/join
  make a spec's card, priority and due read from cards, `CARDS_LAYOUT = 4` + upgrade step, docs, version).
