# Phase 7 preflight — the question and the babysit procedure

Inputs: phase entry, `2026-10-10-babysit-procedure-recon.md`, `principles.md`. Paths under
`skills/spec/tools/`.

## Findings that change the plan

1. **"placeTree unchanged" can't refuse a new tree.** `trees/place.ts:56` cuts the tree as soon as
   `findTree` misses; launch only sees the result. Refusing afterwards leaves a stray tree and branch.
   Fix: `placeTree(…, { existingOnly: true })` returns `no tree for <branch>` before `addPlacedTree`.
2. **A PR claim already makes a flight row, without its group.** `board/flight.ts:21` adds every claim
   key as a row; `:27` looks `pr-A` up as a phase id and finds no `prGroup`. The babysitting join keys on
   the group, so the claim row must carry `prGroup` from its id, or it renders as a bare row with a PR
   the board can't tie to the group.
3. **Three readers of the `pr-<group>` id** (`claims/rules.ts:50` take, `board/flight.ts:27` row group,
   `board/joins.ts` babysitting) → one pure parser `claims/pr-claim.ts` (`prClaimGroup`, `prClaimId`)
   with its own test (principles §9).
4. **Which claim statuses mean "babysitting".** `live` and `remote` clearly; `unknown` (session files
   unreadable) must count too, or the board would ask Anton to merge a PR a live babysitter is about to
   merge. `closed`/`done`/`gone` don't. Matches `claimsOnBoard` (`board/flight.ts:43-45`) minus `closed`.

## Canon against phase 7

| Rule | Verdict | Consequence |
|---|---|---|
| SRP / small functions | Bites | `takeRefusal` gains one early branch for PR ids; keep the phase path as is |
| No flag arguments | Bites | `existingOnly` is an options-object field, not a positional boolean |
| OCP | Bites | `FlightNext` gains `babysitting`; `prVerdictRow` (`attention.ts:31-36`) needs no edit since it keys on `fix CI`/`merge` |
| Single source of truth | Bites | Group-token shape lives in `pr-claim.ts`; `sessionLaunch` reuses it |
| Clean Architecture | Inert | All pure model/join code plus CLI glue already split |
| DDD | Inert | Tool code, no domain model |

Guard blindness: `skill-wiring.test.ts:100-112` pins one router per sub-command, so adding `babysit` to
`SUB_COMMANDS` fails until `skills/spec-babysit/SKILL.md` exists — guard sees it. Board JSON
`BOARD_VERSION` stays 1: both changes are additive (optional `PrCell.babysitting`, a new `next` value).

Seam deltas vs recon: none; no file nears 250 lines.

## Amendments

1. `placeTree` takes `{ existingOnly }`; `launch babysit` passes it and resolves group → first phase of
   the group from the checkout's spec state (base view is placeTree's own business).
2. New `claims/pr-claim.ts` + test; `takeRefusal` accepts `pr-<g>` when a phase has `pr: <g>`, else
   refuses `PR group <g> is not in <spec>`.
3. `flightRows` sets `prGroup` from a PR claim id; `attachPrs` marks `babysitting` on every row of that
   spec + group while a live/remote/unknown PR claim exists: `PrCell.babysitting`, `next: "babysitting"`,
   `prCell` renders `#n babysitting`.
4. `babysit` pack: `PACK_MODES` yes, `INFERRING_MODES` no (launch always names spec + group). Small
   `babysitPack`: settings line, the group's phases, doctor — not the resume pack's next chunk.

## Decisions for you

None.
