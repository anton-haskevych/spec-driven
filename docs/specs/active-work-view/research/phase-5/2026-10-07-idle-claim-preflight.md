# Phase 5 preflight — idle claims (2026-10-07)

## Findings that change the plan

1. `rowName` (`board/cells.ts:25-28`) takes one `phase`; an idle row lists several (`1, 2, 4a`). The
   render builds `<spec> · <phases joined ", ">` itself rather than bending `rowName`.
2. "One row per session" vs. copy `<spec> · <phases>`: a session holding claims on two specs can't fit
   one spec cell. Group by session **and** spec; in practice that is one row per session.
3. The only `AttentionRow` consumers are `attention.ts`, `render.ts:88-96` and `--json`; no exhaustive
   switch to update. Golden (`tests/board-no-focus-golden.test.ts:19,24`) holds a *busy* live claim, so it
   stays unchanged — which is itself the proof that busy sessions are never flagged.

## Canon (condensed)

| Rule | Verdict | Consequence |
|---|---|---|
| Names (Clean Code) | Bites | `idle`, never `stale` (`claims/rules.ts:43` `isStale` = safe to take over) |
| Small functions / SRP | Bites | `idleClaims` filters; a separate `groupBySession` folds rows |
| Dependency rule / DIP | Inert | Pure function over `BoardInputs` like its siblings |
| OCP | Inert | New union member; `attentionCells` adds one line |
| DDD | Skipped | Tooling, no domain model |

## Seam / testability (deltas from recon)
None. `liveSession` defaults to `status: "idle"`, `updatedFrom: "updatedAt"` (`tests/factories.ts:71`).

## Amendments
1. Model: `{ kind: "idle-claim"; spec; phases: string[]; session: string; since: string }`.
2. `sessions` "local" or `ok: false` → `[]` before any filtering.

## Decisions for you
None.
