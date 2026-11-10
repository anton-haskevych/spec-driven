# Subagent parentage preflight

Inputs: Phase 2, adjacent recon, runtime entry/decode/sessions, existing identity helpers and tests, principles.md, owning Phase 2b contracts. No new runtime/library primitive is required.

## Findings that change the plan

1. entry.ts:60 confuses delegation and competition; decode.ts:30 discards native parentage. Keep this source field through the adapter and change only the occupation predicate, not claims or launch policy.
2. The generated ThreadReadResponse parentThreadId description and real child metadata provide the authority. forkedFromId cannot substitute: ordinary forks must still compete. Do not parse a second source-label ancestry format.
3. runtime/identity.ts:7-16 already owns qualified keys/equality. The new pure traversal must use it at every edge and stop on cycles/missing intermediate sessions. No naked-ID exclusion or new ownership registry.
4. entry.ts:113's injected observation tests can hide decoder omissions. Extend its existing raw RPC fixture with child metadata, plus pure graph/decoder tests; fixtures alone do not pass native recon.

## Clean Code

| Rule | Verdict | Consequence |
|---|---|---|
| Names/distinctions | Bites | parent on RuntimeSession is delegation, not continuation or copied-history fork. |
| Functions/one level/arguments/flags/queries | Bites | isSessionDescendant is a small pure boolean query; entry.ts keeps boundary I/O. |
| Comments, classes | Inert | |
| Objects/data/encapsulation/Demeter | Bites | sessions.ts exposes plain qualified refs, not native wire objects. |
| Errors/Special Case | Bites | decode.ts rejects malformed parent metadata; missing verified ancestry grants no exemption. |
| Boundaries/learning tests | Bites | Real native metadata and generated schema confirm top-level parentThreadId. |
| TDD/FIRST/simple design | Bites | Direct/nested descendant red cases and independent-root controls precede code; no second session registry. |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule/circles/plain boundary data | Bites | decode.ts maps native fields; runtime descendant predicate consumes SessionRef values. |
| Humble edge/policy vs detail | Bites | entry.ts reuses native snapshot; pure traversal owns only ancestry comparison. |
| REP/CCP/CRP | Bites | New helper and its direct tests stay beside runtime sessions/identity concern. |
| ADP/SDP/SAP | Bites | No core-to-native imports or new provider abstraction. |
| Screaming architecture/tests outermost | Bites | is-session-descendant.ts and runtime-session-descendants.test.ts name exactly their rule. |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | Native adapter decodes; descendant helper relates sessions; entry guards occupation. |
| OCP/ISP | Bites | Optional parent preserves existing Claude session producers; consumers need not invent lineage. |
| LSP | Inert | |
| DIP | Bites | Entry uses existing SessionRef/RuntimeSession and identity helpers, not native schema classes. |

## DDD

| Rule | Verdict | Consequence |
|---|---|---|
| Ubiquitous/published language/ACL | Bites | Native parentThreadId maps to qualified parent; forks remain distinct. |
| Value objects/invariant ownership/factories | Bites | decode.ts validates wire parent IDs once; typed local session factory supplies required test fields. |
| Entities/aggregates/cross-aggregate repositories/events | Inert | No persisted ownership change. |
| Services/contexts/shared kernel | Bites | Existing runtime identity helper is reused; no second coordination framework. |
| Specification/pure assertions | Bites | Traversal tests cover same-source direct/nested chains, order, cycles, missing/foreign parents and unrelated roots. |

## Guard blindness and testability

Current entry tests never load a valid child. Add that red integration path through the raw RPC decoder and a real native positive. Retain independent occupant/stored-claim/unavailable coverage controls. Source files remain below 250 lines; graph cases belong in a new focused test file. No extraction-first obstacle or new fixture server.

## Amendments and defaults

Use only top-level parentThreadId, optional qualified parent, a bounded visited-set traversal of the existing snapshot and the current entry guard. Only verified descendants of the initiating session gain exemption. No ignored-ID list or serial-recon requirement. Validate source, then repeat the scoped native install/recon/removal under Anton's existing authorization to fix and verify this blocker. All full-parity obligations remain.

## Forks for you

None.
