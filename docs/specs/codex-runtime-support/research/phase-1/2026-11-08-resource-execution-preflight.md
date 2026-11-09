# Resource-execution preflight

Inputs: Phase 1 plan, `2026-11-08-resource-execution-recon.md`, existing install tests/RPC/version helper and `skills/spec/principles.md`. Scope is a bounded native experiment plus offline observation fixtures; production ownership/update wiring stays unchanged.

## Findings that change the plan

1. `runtime-codex-install.test.ts:16-22` explicitly freezes zero model turns. Metadata cannot establish execution, so the new proof needs actual completed command output and must live in a separate fixture.
2. Installed `ThreadShellCommandParams.ts:5-18` runs unsandboxed. Restrict commands to finite, read-only scripts/resources under the new owned scratch root, with a 10-second native timeout; do not use this route as a production worker or sandbox proof.
3. `probe-rpc.ts:76-88` observes but cannot answer server requests. Inspect isolated account metadata before attempting model-backed execution; do not add credential forwarding, approval fabrication or transport features merely to complete the experiment.
4. `scripts/version.py:47-52` reports package versions, not loaded-session identity. Correlate owned native thread/cwd, selected historical path and source hashes independently. A fresh catalog or successful new-path command cannot attest the old session's loaded model context.

## Clean Code against the proof

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names and concepts | Bites | Name direct-thread shell evidence separately from active-model release attestation. |
| Small, single-purpose functions and few arguments | Bites | Keep driver protocol calls, event waits, snapshots and ownership checks separate. |
| Comments | Bites | Record experimental limits in the evidence README; code names express mechanics. |
| Objects/data, Demeter | Inert | Plain observation records only. |
| Errors and nulls | Bites | Reuse Result and boundary checks in `probe-rpc.ts`; null account remains unavailable authentication. |
| Boundaries/learning tests | Bites | The real native experiment establishes the observation; offline fixtures only preserve it. |
| Tests/TDD/FIRST | Bites | Run new evidence assertions red before adding observed data; default tests never invoke native installation. |
| Classes and Beck simplicity | Bites | No new framework or production adapter. |

## Clean Architecture against the proof

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule/circles | Bites | Experimental outer driver uses `connectProbeRpc`; policy remains untouched. |
| Plain boundary data | Bites | Sanitize scratch paths, preserve protocol provenance and exact outcomes. |
| Humble Object/policy versus detail | Bites | Native execution is an experiment, not a mocked policy guarantee. |
| Component cohesion/coupling | Bites | Keep fixtures with runtime install tests; do not add a dependency to claims/board/trees. |
| Screaming architecture/tests outermost | Bites | `codex-resource-execution` names the specific evidence and its limits. |

## SOLID against the proof

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP by actor | Bites | Native host owns installs; proof controller owns only its scratch resources. |
| OCP | Inert | No production variants added. |
| LSP | Inert | No provider replacement. |
| ISP | Bites | Reuse request/close only; do not widen the read-only facade. |
| DIP | Bites | No native transport imports enter shared policy. |

## DDD against the proof

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Ubiquitous/published language | Bites | Installed release, pinned path, native shell and loaded-model release remain distinct. |
| Entity/value/invariant ownership | Bites | Exact native thread and cwd fence every shell/control request. |
| Aggregates/repositories/events/factories/domain services | Inert | No business state or production domain layer changes. |
| Bounded context/anti-corruption layer | Bites | Wire records remain in experimental evidence; managed capabilities stay unverified. |
| Specifications/pure assertions | Bites | Tests assert native completion and explicit unavailable coverage rather than infer from cache absence. |

## Guard blindness and testability delta

The existing version check sees three manifest versions, not resource availability or model selection. Existing static observation assertions do not run the native host. New tests retain this limitation explicitly; no guard is advertised as end-to-end enforcement. No recon size estimate changed and no production extraction is required.

## Amendments

1. Establish direct native resource execution first, with an explicit model-authentication read gate and honest evidence classification.
2. Use a new single-writer journal/home rather than mutate session 2's historical proof.
3. Preserve both remaining Phase 1 checkboxes until every stated obligation is met.

## Defaults applied

Use an additional offline observation fixture and existing RPC/native install flow. Preserve all live installation, auth, model, permission and trust settings. No push or publication.

## Forks for you

None before the bounded proof. A demonstrated required-resource failure may require a concrete design amendment afterward; it never restores the rejected blanket wait-for-all policy automatically.
