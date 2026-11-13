# Phase 8 preflight — card documents and card add/update/source/list (deliverables 1–2; cover next)

Inputs: phase entry, `2026-11-13-cards-recon.md`, `skills/spec/principles.md`. Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **The doctor's project checks see no record.** `commands/doctor.ts:40` builds `projectIssues` from
   `projectDir` alone; `plans` (local copy) is in scope at :27. `card check` takes `recordViewOf(plans.record)`
   and runs only when there is a view. An `Issue` needs a file and `formatIssues` prints it relative to the
   project (`doctor/issue.ts:19-23`): a record document is named `refs/spec-board/record/<path>` under the
   project dir so the line reads as a place, not a `../..` path.
2. **"Only join and card add refuse offline"** (`design.md` → *Offline*). The other card writes queue like a
   tick. The outbox is already generic: `recordWorld` + `sendRecordIntent` (`plan/record-send.ts:29-55`) and
   `PLAN_RUNNERS` (`plan/intents.ts:14-21`), whose rows are also the overlay's planners. One `card` intent kind
   (args carry the action) is enough; no spec key, so it does not go through `withSpec`/`withPlanNotice`.
3. **`card add` needs the default branch's switch, not the checkout's.** `boardBase` (`plan/board-base.ts`)
   reads it from `origin/<default>` and already refuses offline with a `never queued` reason: reuse it.
4. **`p0` changes pinned wording.** `PRIORITIES` (`core/schedule.ts:3`) is pinned as `p1, p2, p3` in
   `tests/schedule.test.ts`, `tests/doctor.test.ts`, `tests/backlog.test.ts`. `priorityRank` keeps relative order.
5. **`board.people` is an unknown key today** (`playbook/settings.ts:65`, :160): add it to `BoardSetting`,
   `SECTION_KEYS`, defaults (`[]`) and `describeSettings`.

## Clean Code / SOLID / DDD against the unit

| Rule | Verdict | Consequence |
|---|---|---|
| Names, one word per concept | Bites | "card" throughout: `cards/card-doc.ts`, `cardDocPath`, `nextCardId`; no "item"/"idea" types |
| Small functions, files < 250 | Bites | `commands/card.ts` dispatches over `commands/card/<action>.ts` as `commands/crew.ts` does; pure plans in `cards/plans.ts`, split if it nears 250 |
| Pure core, I/O at edges | Bites | readers and plans are pure over `RecordView`; commands own git, settings, clock |
| SRP by actor | Bites | readers (shape rules) ≠ `card check` (cross-document) ≠ plans (intent at a tip) |
| OCP | Bites | `plan/kinds.ts` `KINDS` gains three rows; the store stays untouched |
| DIP | Bites | the store is handed `validateRecordDoc`; `cards/` never imports `record/write` beyond types |
| Invariant ownership | Bites | one-origin per card: the source plan refuses a second origin at the tip; `card check` reports drift. Card id ↔ path: `identity` row in kinds.ts |
| Clean Architecture boundaries | Inert | no framework or DB; same layering as `questions/` |
| LSP / ISP | Inert | |
| Aggregates / events | Inert | |

## Amendments

1. `cards/paths.ts`: `cardDocPath(id)` (`cards/<n div 100>/c<n>.json`), `sourceDocPath(card, letter)`,
   `tagDocPath(slug)`, `tagSlug(name)`; `plan/kinds.ts` imports them for its three rows.
2. `cards/contact.ts`: `contactDetailsIn(text)` (email; a phone = 10+ digits in one run of digits and
   separators, a run holding a `YYYY-MM-DD` is a date, not a phone). Card and source readers report it.
3. Card writes other than `add` go through `sendRecordIntent` with intent `card`; its runner is registered
   in `plan/intents.ts`.
4. `card check` = `cards/check.ts` `cardProblems(view)` (pure) + `doctor/cards.ts` mapping to issues.

## Defaults applied

- A card has no `tasks` field yet (technical.md lists it optional; nothing writes or reads it).
- Source ids are letters `a`…`z`, then `aa`, `ab`… (`technical.md`: `<letter>.json`), the next taken in the plan.
- `card add` without `--ref` stores `session <id>` (else `conversation`); `--at` defaults to now.
- Tags on a card are free strings, as on the Academy board; a tag document is optional detail, written by
  `card tag` (later chunk).
- `card update` sends the card's version as `ifVersion` from this machine's read, as `question answer` does.

## Forks for you

None.
