# Command inputs — preflight

Grounded in the paired recon, active phase, principles and the source/tests cited below. No repository or personal `.claude/rules` directories exist here. House idioms: plain data, injected function ports, typed fixtures, isolated Git integration checks. House errors-as-values outranks Clean Code's exceptions preference.

## Findings that change the plan

1. Execute rendering is not pure (`context/packs.ts:65,75–80`); load reference data first using `diskReader`, then render without filesystem access. Select a phase before phase-playbook loading (`commands/context.ts:104`).
2. Placement dependencies are also pruning's legacy type contract (`trees/prune.ts:21`, historical fixture `trees/prune.ts:16–21`). Keep PlaceDeps compatible, introduce separate narrow PlacementDeps, and move production I/O to a system adapter. No prune policy changes.
3. Existing claims cannot represent source identity (`claims/store.ts:9–19`). A read-only context bridge must bind legacy claims to an explicitly supplied Claude source, use existing qualified equality/coverage, and never enable writes.

## Clean Code

| Rule | Verdict | Consequence |
|---|---|---|
| Names, distinctions, one word/concept, solution/domain names | Bites | Name loaded reference values and PlacementDeps by their role (`context/packs.ts:20`, `trees/place.ts:31`). |
| Small/one-thing/one-level functions, few args, no flag args | Bites | Context and placement requests/dependencies replace five positional args (`commands/context.ts:39`, `trees/place.ts:63`). Keep option flags as existing request policy. |
| Side effects, command/query separation | Violated, fix here | Pull disk reads out of executePack (`context/packs.ts:65`). |
| Comments | Bites | Preserve only compatibility/why explanations at the historical type export. |
| Objects/data, Demeter, anti-symmetry | Bites | Plain pack references and PlaceWorld; hide runners in the system adapter (`trees/place.ts:49`). |
| Errors, null, Special Case | Bites | Keep Result failures and missing-reference semantics; no failure-as-empty liveness (`claims/live.ts:27`). |
| Third-party boundaries, learning tests | Inert | |
| TDD laws, one concept, FIRST | Bites | Direct pure renderer, async loading and isolated Git fixtures (`tests/context.test.ts:122`, `tests/trees-command.test.ts:10`). |
| Classes, SRP, cohesion | Inert | |
| Beck simple design | Bites | Reuse diskReader, session equality and existing scan composition instead of a runtime framework. |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency Rule, circles, policy/detail | Bites | Pure rendering/selection depend on plain inputs, not fs/host (`context/packs.ts:65`, `commands/context.ts:104`). |
| Plain data across boundaries | Bites | PlaceWorld excludes Git execution; adapter owns it (`trees/place.ts:50,81`). |
| Humble Object | Bites | Legacy loading/setup stays in place-system; narrow ports cover policy (`trees/place.ts:80–125`). |
| REP, CCP, CRP | Bites | Keep context loading beside context, placement I/O beside placement; do not grow shared runtime contracts. |
| ADP, SDP, SAP | Bites | Preserve legacy type export without a runtime dependency cycle (`trees/prune.ts:16`). |
| Screaming architecture | Bites | Existing context/trees domain folders remain authoritative. |
| Tests outermost | Bites | Fixture dependency factories do not enter production (`tests/factories.ts:16`). |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP by actor | Bites | Command loads host data; renderer formats workflow policy (`commands/context.ts:64`, `context/packs.ts:63`). |
| OCP | Bites | Next async native reader fits HeldReader without changing pack policy (`commands/context.ts:33`). |
| LSP | Bites | Sync and async readers yield the same HeldPhases semantics, no runtime type branch. |
| ISP | Violated, fix here | placeTree no longer receives BoardRunners/env/home (`trees/place.ts:31`). |
| DIP | Bites | Existing function ports suffice; no broad host interface (`trees/place.ts:75,107`). |

## DDD

| Rule | Verdict | Consequence |
|---|---|---|
| Ubiquitous/customer language | Bites | Preserve phase, claim, source and placement terms and existing output. |
| Entity/value, invariant ownership | Bites | Source/session equality stays in runtime/identity; held policy owns coverage interpretation (`runtime/identity.ts:11–16`). |
| Aggregates, cross-aggregate consistency, repositories | Inert | |
| Factories | Bites | System adapter composes old I/O; tests use typed fixtures. |
| Domain services/policies | Bites | Held-phase selection remains pure (`context/held-phases.ts:5`). |
| Events | Inert | |
| Bounded context/shared kernel, anti-corruption, wire language | Bites | Explicit Claude binding for legacy claims; no inferred Codex identity (`claims/store.ts:9`). |
| Specification | Inert | |
| Side-effect-free assertions | Bites | No host reads from renderer or normalized held policy. |

## Guard blindness and testability deltas

Typecheck cannot prove filesystem independence or read-once behavior. Add direct behavioral tests; do not cite adapter checks as installed-host/cutover acceptance. Historical hash checks actually observe fixture source changes, so keep fixtures intact. Split oversized context tests; new production files remain under 250 lines/functions under 50. No new library/runtime API is needed; installed Bun is 1.4.4, already characterized in Phase 1.

## Amendments

1. Extract loaded references and pure execute selection; migrate context callers to async with narrow ContextDeps.
2. Introduce request + PlacementDeps and a legacy system adapter, preserving old PlaceDeps for pruning/history.
3. If built in this chunk, limit qualified context integration to an injected read-only legacy bridge, with exact-source unknown coverage retained.

## Defaults applied

Explicit empty ownership readers in command fixtures; preserve historical type compatibility; no production native configuration or mixed-write activation.

## Forks for you

None. These changes stay within the approved extraction/adapter scope.
