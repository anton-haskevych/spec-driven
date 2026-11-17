# Phase 2 preflight — build order, specLayout (2026-11-17)

T = `skills/spec/tools`.

## Findings that change the plan

1. **"Compose `phaseNeeds` the way `unblockCounts` does" disagrees with `readySet` on linear specs.** `phaseNeeds` (`T/ready/ready-set.ts:39-40`) gives a linear phase only the previous phase; `readySet` (`:33-36`) waits on the *first earlier open* phase. A done phase after an open one would put its successor in batch 0 while `ready` says it waits. Use readySet's rule for linear specs.
2. **Same-files orientation is readySet's, not plain order.** `sameFilesWaits` (`:67-74`): a WIP phase never waits and its open sibling waits on it; otherwise the later in progress order waits. A same-files edge that contradicts a `needs` path would loop the layering (readySet itself deadlocks there): orient by needs reachability first.
3. **The `Waiting on other specs:` line is too narrow.** Three things block an open phase from outside the layering: another spec's open phase, an unknown ref (`T/ready/refs.ts:20,23,35`), and a same-spec `needs-deployed` on a phase done but not deployed (`ready-set.ts:47`). One `Waiting:` line carries all three; the phase shows `(waiting)` in Order.
4. **`principle-one-spec-layout.md` names `specLayout(state, meta)`**, the phase and technical.md `specLayout(state, specBranch?)`. `SpecMeta` is CLAUDE.md's (`T/core/spec-meta.ts`); the field is record-only. Use `specBranch`; fix the ledger line.
5. **`base` can't be a branch name in a pure signature** with no default branch passed. Model it as `{ kind: "default" } | { kind: "spec-branch"; branch }`; Phase 3 maps it to `origin/<default>` or `origin/feat/<spec>`.

## Clean Code against Phase 2

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions / one level | Bites | `buildOrder` = edges → cycle → layers → longest; each a function in `build-order.ts`, render in `ready/render.ts` |
| Names | Bites | "order"/"batch", never "wave" (phase note) |
| No flag args | Bites | `ready` gets `--order` via parseArgs; `readyReport` takes a request object, not a boolean |
| Errors as values | Bites | cycle is a field of the result, not a throw |
| Comments | Inert | — |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule | Bites | `pr/groups.ts` imports only `core/` + `plan/docs/pr-doc.ts` (`prBranch`); `shipAloneSuggestions` in `ready/build-order.ts` because it needs `board/phase-keys.ts` |
| Humble object | Bites | `commands/ready.ts` stays the only I/O; build order and layout pure |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | layout (branches/bases) vs order (graph) vs suggestions: three functions, two files |
| OCP | Bites | Phases 3–5 add callers of `specLayout`/`branchOf` without editing them |
| LSP / ISP | Inert | — |
| DIP | Inert | no ports; pure over `SpecState` + nodes |

## DDD

| Rule | Verdict | Consequence |
|---|---|---|
| Ubiquitous language | Bites | code says *group*; prose and output say *lane* (technical.md Terms) |
| Invariant owner | Bites | `specBranch` shape checked once, in the `SpecDoc` reader; consumers trust it |

## Guards
No architecture or import guard covers `pr/` vs `board/`; the split is by convention. Not this phase's to add.

## Seam and testability (deltas from recon)
None. `readyReport`'s default output is pinned by `record-readers.git.test.ts:83,106`; `--order` is additive.

## Amendments
1. Linear spec: each open phase needs the nearest earlier open phase.
2. Same-files: orient a pair by needs reachability, then WIP first, then progress order; the later goes after the earlier as a layering edge.
3. Render one `Waiting:` line; mark blocked phases `(waiting)` in Order.
4. `specLayout(state, specBranch?)`; ledger principle line corrected.
5. `GroupBase = { kind: "default" } | { kind: "spec-branch"; branch }`.

## Defaults applied
- `specBranch` flows SpecDoc → `RecordFields` → `SpecFields` → `SpecNode.specBranch`; `ready` reads it off the node.
- `branchOf` reuses `prBranch` (`T/plan/docs/pr-doc.ts:54`).
- Mode is on only with `specBranch` set and at least one `pr:` group; `layout.ungrouped` lists open code phases without `pr:` (feeds `No lane:`, and Phase 3's refusal).
- Lanes list groups with open code phases, in phase order. A spec with no groups prints `Lanes: none (no pr: groups)`.
- `Ships alone?` suggests groups holding a same-spec `needs-deployed` target not yet deployed, minus groups already ship-alone.
- Longest chain walks the same edges as the layering (same-files included: they serialise the run).

## Forks for you
None.
