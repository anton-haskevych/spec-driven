---
date: 2026-11-18
wave: 0
lens: inherited
from: design session in spec-driven, 2026-11-18
slug: crm-relations
---

# Wave 0 — how specs relate in CRM today

Measured in `~/IdeaProjects/crm` on 2026-11-18 with the repo's `spec.ts` (source checkout) and `rg` over
`docs/specs/*/CLAUDE.md`. Counts are mine, run in that session; the pointer-phase count is a prose match and
is approximate.

## Counts

| Fact | Number |
|---|---|
| Specs | 445 (222 done, 102 active, 52 draft, 35 good-enough, 17 prep, 6 abandoned, 1 paused) |
| Specs declaring `related` | 197 |
| Specs declaring `needs` (spec level) | 28 |
| Specs declaring `part-of` | 12, under 4 parents (`staff-ios-app` 7, `directory-accounts` 2, `migration-engine` 2, `first-party-analytics` 1) |
| `graph academy-ballroom-migration` | 4 `needs` (all done), about 45 `related` lines in both directions |
| Cards tagged `Academy Ballroom` | 66, all open; 37 covered, by 18 different specs; 29 with no covering spec; 2 covered by more than one spec |
| Academy migration phases | 48, of which 5 are "Moved" in from or out to other specs |
| Phase files that read as a pointer to another spec's phase | about 34 |

## What the three axes answer

- `part-of`: which product area or tool family the code is in. A tree, nests to any depth.
- tag → card → `coveredBy`: who wants it and why. A flat set, no order.
- `needs` (spec and phase level): what order. The only axis a chain can be computed from, and the least used.

## Real order is written as `related` prose

From `graph academy-ballroom-migration`, all under `related`:
- `class-type-categories`: "phase 29 (Academy's class list) needs both; Academy's renames wait on categories"
- `instructor-availability`: "phases 25 (export) and 26 (load) need its phases 1 and 2"
- `pass-rollover`: "Phase 15 needs this before the Jan 1 renewals"
- `class-drop-in-price`: "Academy's front desk sells à la carte classes from day one; go-live needs this"

Other why-lines fall into a few kinds: "owns X this spec builds on", "first studio / first user of it",
"also touches file X, no overlap", "spun off by the review", "phases moved here on <date>".

## Three incidents (CRM sessions, 2026-11-18)

1. **Two copies of one job.** `class-type-categories#6a` planned Academy's class-type merge to 17;
   `academy-ballroom-migration#29` planned the same merge to 15. The oversee session rewrote 29 and turned
   6a into a hand-written pointer ("nothing is built or run here · done when academy-ballroom-migration
   phase 29 is done"). Both are data phases with no code files, so `graph files` overlap never saw them.
   The merge is the cleanup promised to Chasity (card c103, per the oversee session); which phases cover
   that card was not checked.
2. **An umbrella restating its child.** `owner-funnel` (new umbrella) wrote phase 6 as
   `content-lead-funnel#6` plus a Telegram line. Review: "Most problems are in how this spec is wired to the
   specs it depends on." `content-lead-funnel#6` was blocked behind its own phase 3, so the umbrella's
   "phases 1-7 can start now" was false; the Telegram line already existed in code.
3. **The chain drawn by hand.** Asked for "the chain of how do we finally get to having the clean good data",
   the session read seven specs and wrote `chain.html` by hand. Anton liked the result.

## What the chain page holds

Source: `~/IdeaProjects/crm/docs/specs/academy-ballroom-migration/research/2026-11-18-clean-class-data-chain/chain.html`.

| Part of the page | Computable from the record today? |
|---|---|
| Finish line: five plain statements of what "clean" means | No. Written nowhere |
| Three lanes: tools built once for every studio / Academy's data / stays clean (not blocking) | No. No role per member |
| Each stop: spec, phases, state (live, running, ready, waiting, prep), owner | Yes |
| "The longest pole" (`class-type-cleanup`, in prep, owner Taras) | Yes, once the edges are `needs` |
| The order on the live studio, each step with its reason | Edges yes, reasons no (`needs` carries no why) |
| "Not on this path", four specs with a one-line why each | No |
| Bookkeeping done that day | No, and it doesn't belong in a view |

## Tooling gaps (source read, not run under test)

- `skills/spec/tools/graph/` renders one hop in each direction. `checks.ts` follows `needs` and `part-of`
  only to validate them. Nothing walks `needs` transitively from a target.
- `graph <umbrella>` prints `child:` lines with no state or roll-up (`graph migration-engine`).
- A card lists `coveredBy`; nothing flags a second open phase covering the same card at prep or create.
- `SKILL.md` § Relations between specs says what the four link types are, not when to use which or how a
  spec fits a larger goal.
