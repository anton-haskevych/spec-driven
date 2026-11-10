# Owned lifecycle preflight

Inputs: phase-1 plan, owned-lifecycle-recon, principles; parent read transport, probe, transport tests, capability outcomes and local native schemas. House Result/Runner idioms outrank exception-style canon.

## Findings that change the plan

1. `transport.ts:79–86` discards native notifications and server requests. Extract shared RPC mechanics and add a probe-only event observer; keep the read-only facade and its write refusal unchanged. No production worker API is justified.
2. `technical.md:130–134` separates interrupt acknowledgement from cleanup. The experiment needs a real model-launched foreground process tree, marker identities captured before interrupt, then independent turn/process checks before archive. A direct `thread/shellCommand` bypasses the relevant model tool path.
3. `transport.ts:35–37` deliberately has no control capability. The throwaway lifecycle driver may call native writes only against its recorded owned thread/turn, after checking that no later turn exists. Unknown creation/control retains the journal and stops; no automatic retry.
4. `tests/runtime-codex-decode.test.ts` can test synthetic attention mapping but cannot establish real attention. Pending native input/approval is recorded only if actually observed; no global permission/trust changes to induce it.

## Clean Code

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names, distinctions, one concept | Bites | Name RPC acknowledgement, terminal turn and descendant observations separately. |
| Small functions, one level, few args, flags | Bites | Narrow options at socket edge; files <250, functions <50, at most four parameters. |
| Side effects, command/query | Bites | Keep `connectReadOnly` allowlist; lifecycle writes only in explicit driver. |
| Comments | Bites | Journal explains experiment intent; source names explain mechanics. |
| Objects/data, Demeter | Bites | `transport.ts` emits bounded plain frames; no native objects in shared policy. |
| Errors, null, Special Case | Bites | Result remains house idiom; disconnect/error never becomes completion. |
| Boundaries, learning tests | Bites | Disposable Unix endpoint tests extracted transport before native run. |
| TDD, one concept, FIRST | Bites | Red/green for reusable RPC changes and evidence contract; native throwaway experiment is exempt. |
| Classes | Inert | No classes. |
| Beck simplicity | Bites | Reuse socket implementation; no fallback runner, daemon or production control. |

## Clean Architecture

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule, circles | Bites | RPC remains outer adapter; policy factories unchanged. |
| Plain boundary data | Bites | Sanitized fixture records contain observations, not credentials or unrelated history. |
| Humble object, policy/detail | Bites | Live driver observes; pure evidence checks classify separately. |
| REP, CCP, CRP | Bites | Probe/event transport grouped under Codex; no installation machinery. |
| ADP, SDP, SAP | Bites | Existing read-only facade imports shared RPC, never lifecycle policy. |
| Screaming architecture | Bites | Probe-only names distinguish experiment from supported workers. |
| Tests outermost | Bites | Test endpoints and recorded fixtures require no native daemon. |

## SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP by actor | Bites | Transport owns framing/deadline; experiment owns cleanup and ownership. |
| OCP | Bites | Event-capable probe reuses transport without changing read-only permissions. |
| LSP | Bites | No event/control failure is successful empty evidence. |
| ISP | Bites | ReadOnlyRpc does not gain lifecycle methods. |
| DIP | Bites | Shared ownership policy never imports probe transport. |

## DDD

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Language, entity/value | Bites | Native thread/turn identity is evidence, not workflow claim ownership. |
| Invariant owner | Bites | Driver owns fresh turn fencing before any interrupt/archive. |
| Aggregates, cross-aggregate, repositories | Inert | No shared persistence migration. |
| Factories | Bites | Typed frames and disposable endpoint fixtures, no double casts. |
| Services/policies | Bites | Evidence classification stays pure. |
| Events | Bites | Native request/notification observer handles bounded wire values only. |
| Context, shared kernel, anti-corruption | Bites | Native protocol remains at Codex boundary. |
| Published language, specification, assertions | Bites | Validate frame shape and exact owned IDs, preserve unknown outcomes. |
| Side-effect-free functions | Bites | Fixture evidence checks never invoke control. |

## Guard blindness and testability delta

Existing tests cannot prove actual daemon behavior. Focused transport tests protect facade refusals after extraction. Native observations separately establish or falsify disconnect/attention/cleanup. No structural guard automatically checks size, so inspect sizes manually. No additional extraction is required.

## Amendments

1. Extract bounded event-capable RPC with red/green tests, preserving all read-only behavior.
2. Before native writes persist a unique launch intent and cleanup journal; run one controlled model worker and reconnect by its recorded ID.
3. Observe real attention where configured native tools permit; interrupt only its exact owned turn, inspect all controlled descendants before any fallback cleanup, then archive only after verified quiescence.
4. Convert sanitized observations into executable contract fixtures; a demonstrated critical failure parks the design and stops the chunk.

## Defaults applied

- Preserve configured native model/permissions and all Claude behavior.
- Scratch files use an owned temporary directory; no live install, shared claims, hooks or settings change.
- All managed capability flags remain unverified; no Phase 2 wiring.

## Forks for you

None before the bounded probe. A demonstrated critical native guarantee failure requires a separately recorded design decision.
