# Design

## The experience

Claude users keep their existing commands and behavior. A Codex user invokes the native spec skill (for example `$spec execute gift-cards`); native skill naming/discovery is proved in the clean-install tests rather than assumed from Claude's qualified slash syntax. Both enter the same shared mode files and business rules.

```text
native skill invocation
       ↓
host bootstrap → runtime identity + supported capabilities + pinned release
       ↓
shared prep / review / execute / handoff policy
       ↓
small injected ports
       ↓
Claude adapter             Codex adapter
CLI + verified files       supported native APIs / transport
       ↘ normalized sessions, workers, evidence ↙
          shared claims, board, worktree and crew policy
```

## Invariants

1. Workflow decisions have one implementation: runtime adapters translate mechanics, not ownership, phase selection, handoff success, ship modes or approval policy.
2. Resolve the initiating runtime once at the composition boundary. Persist it on every owned launch. A later overseer never infers a worker's backend from its own environment or an ID prefix.
3. Missing/unreadable/incomplete session evidence is unknown, never proof of absence or success. An unsupported feature is refused before creating a worktree, writing a brief or starting work.
4. The current Claude behavior remains the baseline. Adding Codex cannot require a running Codex service on a machine that only uses Claude.
5. Never delete, stop, archive or interrupt work the plugin cannot prove it owns. A completion report alone does not replace existing clean/pushed/handoff/claim-release checks.
6. Native installation selects the release for fresh sessions. Updates may invalidate an older session's helper paths; recover by starting a fresh session. Seamless old-session continuity and custom retention are deferred.
7. Operator communication stays agentic: Anton does not run install/update/diagnostic scripts. The plugin reports one clear actionable status and performs authorized routine operations itself.

## Flows

### Enter a mode

1. Host entry invokes explicit bootstrap with the actual user request and selected native skill root.
2. Resolve runtime and session identity, validate capabilities, and pin version/revision/contracts.
3. Register that this session entered the spec workflow; attach scoped native hook behavior.
4. Load taxonomy, playbooks and context through the existing commands. Codex executes needed bootstrap commands explicitly; it does not depend on Claude's shell interpolation.
5. Dispatch to the same canonical mode file. Project overrides retain their current precedence.

### Concurrent work

A Claude and a Codex session in one repository see normalized records from both participating sources. Claims compare `(execution source, native ID)`, not naked strings; an execution source includes the runtime and an opaque configured-environment key. Source coverage is explicit. A claim on a healthy source can be evaluated even if another source fails; tree-wide destructive/placement decisions require coverage of every participating source. A failed source never globally hides the healthy source's rows.

### Launch and crew

Shared policy builds a launch request. A capability check precedes placement. A normal session uses the existing pure launch plan and terminal acknowledgement. Dedicated background creation has a separate adapter returning a proved owned worker handle. The plugin atomically reserves the run/target/slot before placement, then records source-qualified ownership before scheduling further actions. Roster, wait, stop and completion evidence route using that recorded handle. Controller restarts reconcile records; ambiguous launch outcomes occupy their slot and request attention instead of being blindly retried.

For Codex, success requires demonstrated disconnect survival and child-process cleanup. If the native transport cannot satisfy the contract, phase 3 stops for a design decision; there is no silent fallback to Claude or an improvised detached-process runner.

### Updates

**Chosen scope:** use native updates and start a fresh session if an update invalidates an old session's helper paths. Do not build custom retention or require all old sessions to close for every update. Seamless old-session continuity is deferred so it does not hold up the core workflow. Decision: `ledger/decision-use-native-updates.md`.

Check freshness automatically at entry and at most once per configured check interval (default: first entry of a fresh session; concurrent requests coalesce). Reuse the existing agent-operated native refresh/install/verification flow. Native installed/loaded state is authoritative. Phase 1 records activation, trust and native limitations. Candidate observations do not become a second activation authority. Do not add plugin code that rewrites active tools or reruns the current user request. Offline, failed validation, incompatible runtime, and required hook trust are distinct states. Repeated failures do not produce a warning on every edit.

`Current` means latest successfully checked compatible release, with checked-at time and revision. `Update available` is not `active`. Trust review is not auto-bypassed. During this spec's rollout, installing the managed update behavior requires explicit design/release approval; it remains restricted to spec-driven.

## Status copy

| State | Agent-visible message |
|---|---|
| Ready | `Spec runtime: Codex · plugin <version> · session <id>` |
| Identity unavailable | `Cannot claim this phase: the runtime did not provide a session identity.` |
| Coverage unavailable | `Cannot prove this workspace is free: <runtime> session status is unavailable. No claim or worktree was changed.` |
| Capability unverified | `Codex background sessions are not enabled: <probe that must pass>. Nothing was launched.` |
| Ambiguous launch | `Worker launch outcome is unknown. The slot is held while this launch is reconciled.` |
| Update installed | `Spec-driven <version> is installed. Start a fresh session to use it.` |
| Update blocked | `Spec-driven update needs <trust review / compatible Codex / validation fix>.` |
| Offline | `Could not check for a newer release. Continuing on verified <version>, last checked <time>.` |

## Decisions and alternatives

| Decision | Chosen | Rejected alternative | Reason |
|---|---|---|---|
| Policy ownership | Reuse shared mode files, claims/board/tree/crew policy | Fork the workflow per host | Two policies would drift after each release. |
| Runtime variation | Small injected ports and two concrete adapters | Scatter `if Codex` through use cases; giant universal runtime interface | Boundaries match actual variation, remain testable and avoid a framework. |
| Existing I/O | Wrap existing Claude implementations as the Claude adapter | Rewrite working Claude behavior for symmetry | Characterization tests preserve existing behavior. |
| Identity | Source-qualified session references and legacy decoder | Bare IDs; treating CODEX_HOME as a Claude home | Storage formats and lifetime semantics differ. |
| Session reads | Reuse normalized session consumers with explicit per-source coverage | Treat all unarchived threads as live; failure as empty | History is not liveness; unknown cannot release work. |
| Codex transport | Supported app-server transport behind a narrow client, selected by phase-1 proof | Assume proxy JSONL works; hand-read SQLite/rollout internals | Read-only Unix WebSocket worked; proxy and worker lifetime are unproven. |
| Parsing/transport library | Runtime built-ins where capability-proved, otherwise established pinned library | Hand-written WebSocket/JSON framing | Use the toolchain's tested mechanisms; justify any new dependency. |
| Atomic state | Reuse atomic primitives/shared roots/section writers, with stable target reservations and generation-fenced updates | A new database or daemon registry | Existing state mechanisms already support local coordination. |
| Hook scope | Native bundled Codex hook entrypoints gated by a real spec-session registration | All-purpose personal bridge; always loading spec context | The plugin owns its protocol; ordinary sessions stay cheap. |
| Reviewers | Canonical personas + host binding; honor project overrides | Assume Markdown agents auto-register; copy seven drifting personas | Explicit loading provides the same review lenses on both hosts. |
| Updates | Native scoped install flow; fresh-session recovery if old helper paths disappear | Custom retention; blanket wait for all old sessions; cache patches; second activation selector | Seamless old-session continuity is an edge case deferred by Anton; focus on the core workflow. |
| Capabilities | Prove each supported surface before enabling it | Advertise full parity based on discovered RPC names | Callable method names do not establish operational guarantees. |

## Compatibility and concurrency boundaries

Mixed incompatible writer-contract versions are not supported; compatible plugin release versions may coexist. A managed-route cutover must prevent old installed/cached tools from resuming through supported entry paths before Codex writes are enabled; a marker alone cannot do this. Arbitrary historical tools invoked manually outside those paths remain explicitly outside the guarantee. Prove the fence at Phase 2 mixed-write activation; otherwise park that capability for a design decision. Adapter development and fixture tests can proceed before activation proof.

Read-only planning snapshots are reused, but mutation uses fresh evidence under workspace/run coordination. Concurrent ticks reserve one stable target and numbered slot. A stop/archive failure retains ownership and capacity until acknowledged. User activity on a later unowned turn prevents automatic control of that continuation. These safety contracts are shared by both runtimes.
