# Phase 8 preflight — deliverables 6–9

Inputs: phase entry, `2026-11-13-ideas-and-spec-cards-recon.md`, `principles.md`. Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **The join batch can't see the seed.** `commands/join.ts:100` `newSpecPlan` takes `{ spec, phases, prs,
   questions }`; `planJoin` (`plan/join.ts:56`) drops what `copy()` read except fields, PRs and notes. The card
   seed (title, priority, due, `created:`) must ride on `CopiedFromFiles` → `JoinPlan` → `newSpecPlan`, or join
   writes layout 4 with no card, and layout 4 then lies ("upgraded, card made").
2. **`plan apply` writes layout 4 too** (`plan/apply.ts:25`, sent through `newSpecPlan` at
   `commands/plan.ts:50`). It must carry the same seed from the checkout's `CLAUDE.md`; prep normally made the
   card already, so the ops come out empty there.
3. **A bad seed refuses the whole join.** `validateRecordDoc` runs on every op (`commands/join.ts:67`); a
   card title or quote that trips `cards/contact.ts` would refuse the join and every upgrade after it. Drop the
   card ops (and say so) rather than the batch: check the seed with `readCardDoc`/`readSourceDoc` before adding.
4. **The upgrade guard reads `RECORD_LAYOUT`** (`plan/upgrade-send.ts:18`, `plan/upgrade.ts:97`): raising it to
   4 sends every layout-3 spec through the step on its next touch, which is what we want; nothing else to change.
5. **A card for a prep spec reads as a broken cover elsewhere** until the stub lands on main
   (`cards/check.ts:27` checks covers of open cards against the checkout's specs). Transient (`docs: main`
   publishes the stub at handoff); prep.md says to cover once the folder exists. Not a code change.

## Canon against the unit

| Rule | Verdict | Consequence |
|---|---|---|
| Pure functions (house §3) | Bites | `specCardOps(view, spec, seed)` and `cardSchedules(view)` are pure; I/O stays in `upgrade-read.ts` / commands |
| Single source of truth (§8) | Bites | One "best priority, earliest due" over cards, built on `compareSchedule` (`core/schedule.ts:68`) |
| Extract on second use (§9) | Bites | `specCardOps` has three callers (join, plan apply, upgrade): own file `cards/spec-card.ts`, own test |
| SRP | Bites | `card import` lives in `commands/card/import.ts`; the backlog→intent mapping in `cards/backlog-card.ts` |
| DIP | Inert | Ports exist (`RecordPort`, `RecordView`) |
| Size caps | Inert | Largest touched: `commands/join.ts` 140, `cards/plans.ts` 127 |
| DDD invariants | Bites | "Exactly one origin" stays in the add batch: import and spec cards go through the same create-card ops |
| Guard blindness | Inert | No guard is cited |

## Amendments

1. `CopiedFromFiles.card?: SpecCardSeed`, read by `copyFromFolder`; `JoinPlan.card` passes it on;
   `newSpecPlan` appends `specCardOps` when it creates the spec.
2. `commands/plan.ts` reads the seed from the checkout's spec folder for `plan apply`.
3. `specCardOps` returns `[]` when a non-dropped card covers the spec, and when the seed's documents don't read.
4. `card import` and `card add --cover` reuse `addEdit`'s ops; import refuses when a source already has its ref.

## Defaults applied

- A spec's card: title = `CLAUDE.md` H1 (else the name), commitment `asked`, origin quote = the same title,
  app `spec`, ref `spec:<name>`, occurredAt = `created:` (else now).
- An imported backlog file: commitment `idea`, quote = its body (title when empty), app `backlog`, ref = its
  repo path; the list hides any file a card's source names.
- Spec priority/due = open covering cards' best priority and earliest due, when any covers and the spec is
  unjoined or on layout ≥ 4; otherwise `CLAUDE.md`.
- The table lists open cards that cover nothing beside the remaining backlog files; covered cards show through
  their spec.

## Forks for you

None.
