# Qualified claim storage preflight

Reviewed phase 2's storage-to-context slice against the recon and `skills/spec/principles.md` before decomposition/code.

## Findings that change the plan

1. `claims/store.ts:105-112` is a lossy mutation-oriented legacy boundary. Add a separate read-only document decoder rather than extending this return type or routing qualified records through it.
2. `commands/runtime-context.ts:10,27` can use a second legacy claim read for no-name inference. Make the qualified command derive inference from the same loaded claim rows, with required workspace evidence; retain the small existing normalized bridge as an injectable entry.
3. `spec.ts:62-65` has no configured command injection. Add one narrow optional context command dependency; leave the installed CLI default unchanged. Native configuration certification and mixed mutation activation remain separate.

## Clean Code

| Rule | Verdict | Consequence |
|---|---|---|
| Names, meaningful distinctions, one concept | Bites | Distinguish decoded document/raw record from `SessionPhaseClaim` policy input at `snapshot-held.ts:7`. |
| Small functions, one level, arguments, flags, side effects, query separation | Bites | Pure decoder and separate directory reader beside `claims/store.ts:80`; no writer flags. |
| Comments, objects/data, Demeter | Bites | Plain values and named helpers; mirror `runtime/sessions.ts`. |
| Errors, nulls, special cases | Bites | Reuse `Result`; unreadable/unsupported claim refuses the pack rather than becoming `[]` (`runtime-context.ts:22`). |
| Third-party boundaries | Inert | No new dependency. |
| TDD, one concept, FIRST | Bites | Pure decoding tests; disposable filesystem and command fixture for wiring. |
| Classes | Inert | No classes. |
| Beck simplicity rules | Bites | Reuse existing snapshot/selection; add no generic registry or writer abstraction. |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule, circles, plain boundary data | Bites | Codec depends on plain session refs; storage and command compose inward into `runtimeContextPack`. |
| Humble object, policy/detail | Bites | Filesystem/Git stay at the command/storage seam; `snapshot-held.ts` remains pure. |
| REP/CCP/CRP | Bites | Group document decoding and directory reading under claims. |
| ADP/SDP/SAP | Bites | No claims-to-command dependency; command imports decoder/reader. |
| Screaming architecture, outer tests | Bites | Claim-specific module names; tests inject sources without a native daemon. |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | Persisted-record interpretation, filesystem observation and command rendering have separate actors/modules. |
| OCP | Bites | Unknown schema at new codec refuses explicitly; legacy store does not guess future identity. |
| LSP | Inert | No subtype behavior. |
| ISP | Bites | Dispatch accepts only a context command override, not a full runtime provider. |
| DIP | Bites | Continue injecting `SessionReader`/Runner; no native transport import into claims. |

## DDD

| Rule | Verdict | Consequence |
|---|---|---|
| Language, entity/value, invariant ownership | Bites | Source-qualified ref is a value; codec validates persisted identity, policy compares with `sameSession`. |
| Aggregate/root, cross-aggregate consistency, repository | Inert | No writes or aggregate coordination. |
| Factories, services/policies | Bites | Narrow configured command closure reuses the existing bridge. |
| Events, specification | Inert | No new domain events/specification layer. |
| Context/kernel, anti-corruption, published wire | Bites | Explicit schema 1 and legacy Claude binding; retain original record including unknown fields, never silently reinterpret runtime/version markers. |
| Side-effect-free assertions | Bites | Decoder is pure; filesystem tests prove reads leave bytes unchanged. |

## Guard blindness and testability deltas

Legacy/historical tests cannot prove qualified decoding and remain unchanged. Add dedicated decoder, reader and configured dispatcher fixtures. No additional size or isolation obstacle beyond recon. These tests establish read-only integration only, not native ownership acceptance.

## Amendments and defaults applied

1. Use `schemaVersion: 1` with `ref` and qualified `takenFrom` for the opt-in document format. Legacy records require an explicit Claude source; identity/version markers never fall back to legacy decoding.
2. Retain original parsed records separately from normalized values; add no persistence encoder or mutator in this chunk.
3. Fail the read-only command on unknown/unreadable records, conservatively preserving ownership; use a single claim read for inference and held phases.
4. Inject configured command composition through the existing dispatcher; native CLI bootstrap remains pending.

## Forks for you

None. All choices stay inside the approved read-only storage slice and can be revised before writer activation.
