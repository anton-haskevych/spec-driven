# Identity and read-only snapshot preflight

Inputs: Phase 2 entry, `2026-11-09-identity-snapshot-recon.md`, `skills/spec/principles.md`, existing runtime adapters and tests. House idioms: plain Result values, injected narrow dependencies, pure normalization, fixture RPCs. House error values outrank Clean Code's exception preference.

## Findings that change the plan

1. `runtime/codex/scan.ts:11` already implements injected pagination. Wrap it in a source-bound reader instead of writing a second scanner; narrow `decode.ts:21` and scan to a Codex SourceRef.
2. `sessions/own.ts:3` and `tests/runtime-claude.test.ts:17–20` deliberately retain Claude-only behavior. The new qualified resolver must be opt-in; replacing the legacy function now would silently alter mutation ownership before the writer gate.
3. `runtime/sessions.ts:15–17` carries coverage for a specific source. A generic composer must reject mismatched source observations before accepting complete coverage, while preserving other sources and valid partial rows.

## Clean Code against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names, meaningful distinctions, one word/concept, solution/domain language | Bites | Identity helper names distinguish SourceRef from SessionRef. |
| Small functions, one thing/abstraction, few args, no flags, side effects, query separation | Bites | Resolver is pure; reader orchestration alone awaits connect/read/close. All new functions under 50 lines and four args. |
| Comments | Bites | Identity/reader names express behavior; no narration comments. |
| Objects/data, Demeter, anti-symmetry | Bites | `runtime/sessions.ts` remains plain normalized values, not SDK wrappers. |
| Errors, null, Special Case | Bites | Use Result refusal for missing/conflicting evidence and unavailable coverage for individual source failure. |
| Boundaries, learning tests | Bites | Reuse `scanLoaded` and typed RPC fixtures; no new wire protocol. |
| TDD laws, one concept/test, FIRST | Bites | Red first for identity conflict/equality and healthy-source survival; no live dependencies. |
| Classes, SRP, cohesion | Inert | No classes. |
| Beck simple design | Bites | Two bounded units; no configuration registry or bootstrap command. |

## Clean Architecture against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule, circles | Bites | Codex reader depends on inward SessionReader/SessionSnapshot values; composer never imports native transport. |
| Plain data crossings | Bites | `SourceRef` stays opaque; endpoint/auth stays in injected connector closure. |
| Humble object, policy/detail | Bites | Pure identity module plus small I/O wrappers reuse scanner and Claude mapper. |
| REP, CCP, CRP | Bites | Group source composition by runtime concern, not in board/claim modules. |
| ADP, SDP, SAP | Bites | No legacy-to-composer import cycle; legacy session type imports remain type-only. |
| Screaming architecture | Bites | `runtime/identity`, `resolve-identity`, `read-sessions`, host readers express their concern. |
| Tests outermost | Bites | Typed fixture connectors depend on runtime ports, never production-to-test imports. |

## SOLID against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP by actor | Bites | Host identity evidence and source observation are separate units. |
| OCP | Bites | An additional configured source is another SessionReader, no composer host branch. |
| LSP | Bites | Throwing or failed readers become unavailable for their own source, never erase healthy observations. |
| ISP | Bites | SessionReader has only source/read; no worker/update/control APIs. |
| DIP | Bites | Compose injected readers; retain legacy system factories until safe propagation is designed. |

## DDD against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Ubiquitous language | Bites | Source means configured execution environment, not runtime name alone (`technical.md:73`). |
| Entity/value; invariant owner | Bites | `SessionRef` equality/key includes runtime, opaque key and native ID; resolver validates supplied evidence/configuration. |
| Aggregate, cross-aggregate invariants, repository | Inert | No persistence or aggregate mutations. |
| Factories | Bites | Typed reader factories bind a source; no synthetic identity default. |
| Services/policies, side-effect-free assertions | Bites | Pure identity resolution/comparison; async observation at the edge. |
| Events | Inert | No events. |
| Bounded context/shared kernel, anti-corruption, published wire language | Bites | Existing Codex decoder isolates wire state from shared normalized sessions. |
| Specification | Inert | No specification abstraction. |

## Guards and testability delta

`tests/runtime-codex-decode.test.ts:39` proves only that capability values stay unverified, not installed writer fencing. Do not cite it as activation evidence. Existing fixtures observe exact request lists and connection cleanup. New tests must distinguish same IDs in distinct source keys and foreign-source coverage. No cap or extraction obstacle beyond recon.

## Amendments

1. Implement shared source/session equality and collision-safe keys, then a pure injected identity resolver. Preserve the legacy Claude API unchanged.
2. Add source-bound Claude/Codex readers and compose once per call. Convert source read failures into that source's unavailable coverage; reject duplicate source configuration before reads.
3. Use existing read-only scanner, close each owned connection, and add only fixture tests. Keep all production ownership factories unchanged.

## Defaults applied

Explicit configured source binding; no default daemon/home identity. Missing/dual/conflicting evidence refuses. Composition validates source attribution. No workflow claim or pruning through the unactivated writer; no remote writes under the delegated local-only scope.

## Forks for you

None for this adapter chunk. Native cutover and activation remain open Phase 2 work.
