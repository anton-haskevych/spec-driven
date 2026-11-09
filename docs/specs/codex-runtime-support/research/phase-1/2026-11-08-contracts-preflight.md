# Phase 1 contracts preflight

Inputs: phase-1-runtime-contracts.md, contracts-recon.md, principles.md; source files named by recon read before decomposition. House rules take precedence over canon (Result values and optional fields remain idiomatic).

## Findings that change the plan

1. `sessions/live.ts:15–28` is a Claude record, not a portable DTO: PID, procStart and parked job data must stay adapter input. Introduce plain source/session snapshot values alongside it, preserve change-time/name provenance and never fabricate native PIDs.
2. Most Claude baseline fixtures already exist (`tests/sessions-live.test.ts:19–141`, `tests/launch-background.test.ts:45–97`). Extend gaps and execute those tests rather than duplicate an entire baseline suite.
3. `claims/rules.ts:36–41` and `trees/prune.ts:47–50` cannot observe Codex occupancy. No boundary extraction or method discovery makes managed mixed writes safe. Keep production factories untouched and require separate cutover proof.
4. `core/run.ts:44–61` already supports bounded async CLI probes. Native RPC is a separate narrow read-only edge; no synchronous helper process, global daemon dependency or plugin-install side effect belongs in ordinary tests.

## Clean Code

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names / meaningful distinctions / one concept | Bites | Distinguish observedAt from native changedAt (`sessions/live.ts:23–25`); distinguish source key from runtime. |
| Small functions / one level / few args / no flags | Bites | New runtime modules ≤250 lines, functions <50, ≤4 args; options objects at transport edge. |
| Command-query separation / side effects | Bites | Probe only allowlisted read RPC; no placement/brief/launch in read-only path (`launch/background.ts:14`). |
| Comments | Bites | Preserve existing WHY comments; do not narrate mappings. |
| Data / Demeter / object-data separation | Bites | Wire objects decoded at Codex edge, plain snapshot to consumers. |
| Errors / null / Special Case | Bites | Keep Result (`core/result.ts:1`), explicit unsupported/unverified outcomes, no empty-success on failure. |
| Third-party boundary / learning tests | Bites | Built-in Unix WebSocket gets transport fixtures and actual configured-endpoint probe. |
| TDD / focused F.I.R.S.T. tests | Bites | Baseline characterization first; new mapping/query invariants red before implementation, fixtures independent of home. |
| Classes | Inert | No classes. |
| Beck simple design | Bites | Reuse existing Claude parsers; no universal runtime provider or speculative worker API. |

## Clean Architecture

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule / four circles | Bites | Values inward; Claude/Codex adapters outward; existing factories remain baseline in this chunk. |
| Plain boundary data | Bites | No SDK/WS/PID/auth data in normalized snapshot (`sessions/live.ts:15`). |
| Humble object / policy-detail split | Bites | Transport I/O separate from decoding and capability outcomes. |
| REP / CCP / CRP | Bites | Group capability-specific files under runtime; no omnibus interface. |
| ADP / SDP / SAP | Bites | `sessions/live.ts` may import shared types, never combined adapter composition. |
| Screaming architecture | Bites | Session values and probe roles visible in filenames. |
| Tests outermost | Bites | Inject requests/runners; no test-default daemon/home reads. |

## SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP actors | Bites | Native transport/auth actor separate from ownership policy (`claims/rules.ts:36`). |
| OCP | Bites | Codex maps to shared values without editing Claude parser semantics. |
| LSP | Bites | Failed/incomplete reader never masquerades as complete empty snapshot. |
| ISP | Bites | Read-only probe accepts request edge only; no worker/install methods. |
| DIP | Bites | Continue Runner/Result idiom (`core/run.ts:15–21`); no native dependency in claims. |

## DDD

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Ubiquitous language / value objects | Bites | SourceRef, SessionRef, coverage are values, not native objects. |
| Invariant owner | Bites | Coverage/identity proof at probe boundary; old claim policy unchanged until Phase 2. |
| Aggregate / cross-aggregate / repositories | Inert | No persistence changes. |
| Factories | Bites | Reuse typed liveSession/claim fixtures (`tests/factories.ts:77–83`). |
| Services / policies | Bites | Mapping pure; request orchestration at edge. |
| Events | Inert | No domain event system. |
| Bounded context / shared kernel / anti-corruption | Bites | Minimal normalized values shared; protocol validation stays Codex-local. |
| Published language / specification / assertions | Bites | Validate unknown wire data once; contract tests document conservative mapping. |
| Side-effect-free functions | Bites | Mappers are deterministic with explicit observation time. |

## Guard blindness and testability delta

CI runs `bun test` and `bun run typecheck` (`.github/workflows/plugin-metadata.yml:20–26`); neither proves live endpoint coverage, native trust or cutover. No structural size guard exists, so inspect new file/function sizes directly. No additional extract-first work beyond the minimal shared type boundary is justified by the recon.

## Amendments

1. Chunk 1: characterize gaps, add the minimal session value boundary and Claude mapper, retaining legacy exports/consumers.
2. Chunk 2: bounded injected read-only Codex probe with transport/response fixtures; explicit capability limitations. Use maintained built-ins only after local proof, otherwise review a dependency.
3. Chunk 3: controlled lifecycle/cutover/distribution evidence only as earlier probes allow. A failed critical proof parks the design fork; never introduce a fallback runner or activate mixed writers.

## Defaults applied

- Preserve existing Claude production composition; new boundary is opt-in until later approved phases.
- Preserve `NameSource` and timestamp provenance; distinguish observation from change time.
- Tests use synthetic/sanitized fixtures; live probes are explicitly invoked agent operations.

## Forks for you

None before these bounded proof units. A failed critical capability will become a separate parked design question with evidence.
