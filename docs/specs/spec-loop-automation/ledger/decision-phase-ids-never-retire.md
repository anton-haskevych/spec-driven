---
kind: decision
applies-to: [phase 1, 3]
created: 2026-09-30T15:16:12-07:00
---

# Phase ids never change or disappear; split keeps the original id

The draft's `phase split 7` → `7a`, `7b` retired id 7, which breaks exactly what "never renumber" protects: `spec#7` refs (`ready/refs.ts:21-22` → "has no phase 7"), `[phase 7]` ledger scopes (`samePhase` is exact, `ledger-scope.ts:55-56`) and `research/phase-7/`.

Decision: split keeps `7` (its file, ticked items, prose); new parts take the next free letters (`7a`, `7b`); `add --after 7` also uses letters and inserts after the last `7*` line. Ids compare with `comparePhaseIds` — dotted parts numerically (`9.10` > `9.9`), letters after their number (`7` < `7a` < `8`) — replacing `numericPart`, which returned a number and collapsed `7a`/`7b` to 7.

Shipped in phase 1 (`core/phase-title.ts`): `comparePhaseIds` is the total order (dotted parts, then letter suffix by length then alphabet, then any tail like `-pre`; `undefined` for ids without a leading number); `[phase N+]` uses it. Relation ranges use `phaseInRange`, which keeps the documented membership rule — letter phases of the upper bound are in (`4-5` ∋ `5a`), dotted inserts after it are out (`4-5` ∌ `5.5`). Phase 3's `add --after` insertion order should sort with `comparePhaseIds`.

Rejected: dotted ids for new phases (CRM uses them more, but letters already exist in the plugin, e.g. `2b-pre`, and either works once the comparator is fixed); split into `7a`/`7b` with a rewrite of every reference (touches other specs).
