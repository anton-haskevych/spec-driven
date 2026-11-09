# Technical contracts

Historical starting facts: `research/2026-11-08-runtime-seams.md` and `research/2026-11-08-codex-capabilities.md`. Current foundations are in `code-map.md`; native observations remain bounded historical evidence. Reuse implemented contracts instead of rebuilding them to match illustrative targets.

## Implementation order

| Phase | Owns | Activation evidence |
|---|---|---|
| 2 | Minimum packaged native entry, configured local context and restricted local handoff | Exclusive separate-clone pilot, actual candidate assets/current ID/cwd, guarded unavailable actions, real local work/fresh pickup |
| 2b | Shared claims/board/list/placement/prune and remote identity | Compatible managed-entry transition, qualified consumers and mutation-time coordination |
| 4 | All interactive modes, native agents/personas/hooks and full managed handoff | Project overrides, actual trusted native hook feedback, Claude compatibility |
| 3 | Normal native launch, next sessions and spin-offs | Correct terminal/native request/cwd and no worker-ownership fabrication |
| 3b | Background launch, worker/overseer records, control/evidence and crew/babysit | Owned lifecycle, reservations/reconciliation, attention and acknowledged cleanup |
| 6 | Complete parity closure and consolidated CI | Every workflow-parity.md row with real feature evidence and no Claude regressions |

The complete port remains required. Tests and native acceptance accompany enabled features; Phase 6 does not defer basic verification.

## First-use composition

Start from `createStoredRuntimeContextCommand` in `commands/stored-runtime-context.ts`, `runtimeContextPack`, `resolveIdentity`, `readSessionSnapshot` and the existing dispatcher. Bind one proved native source, verify its actual initiating ID/cwd, and identify the candidate asset root/revision being executed. No new host broker or bootstrap framework.

The restricted pilot is one exclusive checkout with a different Git common directory from existing managed worktrees. Reuse `gitCommonDir`/`stateDir` and ordinary Git operations; verify the old clone's real prune enumeration cannot include it. Same-common-directory use waits for Phase 2b.

Native composition enforces the pilot command capabilities before dispatch: local named-spec/phase context, edits, existing validation, local phase/ledger/in-flight updates and commits only. Refuse unready claim/takeover/remote mirroring, board-based allocation, trees/cleanup, push/publication, launches and crew. A context override alone is insufficient: the other default registry commands remain Claude-only. No fallback through legacy factories or raw command invocation is a supported pilot path.

Document the pilot once in shared mode/capability handling so execute/handoff automatic calls observe its limits. Report a local restricted handoff; do not report ownership/publication/cleanup as done. Existing Claude paths and approvals are unchanged. Use existing lesson recall and `issuesForWrittenFile`/doctor explicitly until Phase 4 native hooks provide automatic feedback; exercise invalid-edit correction. No second checker, clone/profile manager, personal bridge or updater.

A fresh native acceptance session must execute candidate assets, not merely see a candidate catalog/version. Existing cached skills and branch files may differ. Keep the assigned implementation tree explicit while regrouped metadata remains branch-local.

## Dependency direction

```text
commands / shared workflow policy
          ↓ injected application ports + normalized values
runtime/sessions.ts + narrow application ports
          ↑ implemented by
runtime/claude/*           runtime/codex/*
CLI, PID checks, files     supported native client + protocol decoding
          ↑ composed only in
existing command/system dependency factories
```

`claims/`, `board/`, `trees/` and crew decisions must not import the Codex client, native SDK types, WebSocket details, environment-variable resolution or Claude transcript readers. No `Codex` branch in phase-selection, ownership or completion policy. Existing `Runner`, `AsyncRunner`, `Result`, polling, command rendering and atomic state helpers remain the house mechanisms.

Adapters depend inward. Do not make `sessions/live.ts` import the combined runtime reader that imports it back. Keep the Claude parser/PID verification at the edge, exporting a normalized result through an adapter.

## Small ports and values

Existing source/session/coverage values live in `runtime/sessions.ts`; its fuller display/change-time fields remain authoritative. `SessionReader` lives in `runtime/read-sessions.ts` and is source-bound as shown below. Launch/worker ports are remaining design targets, implemented only with their consuming increment:

```typescript
type RuntimeId = "claude" | "codex";
interface SourceRef { runtime: RuntimeId; key: string }
interface SessionRef { source: SourceRef; id: string }
interface SourceCoverage {
  source: SourceRef;
  state: "complete" | "verified-absent" | "unavailable";
  reason?: string;
}
interface RuntimeSession {
  ref: SessionRef;
  cwd: string;
  status: "busy" | "idle" | "shell";
  observedAt: string;
  attention?: "approval" | "input" | "error";
}
interface SessionSnapshot {
  sessions: readonly RuntimeSession[];
  coverage: readonly SourceCoverage[];
}
interface SessionReader {
  source: SourceRef;
  read(observedAt: string): Promise<SessionSnapshot>;
}
interface NormalLaunchPlanner { plan(request: LaunchRequest): Result<NormalLaunchPlan> }
interface WorkerLauncher { launch(request: LaunchRequest): Promise<Result<WorkerHandle>> }
interface WorkerControl {
  inspect(handle: WorkerHandle): Promise<Result<WorkerObservation>>;
  interrupt(handle: WorkerHandle): Promise<Result<StopOutcome>>;
  archive(handle: WorkerHandle): Promise<Result<void>>;
}
interface CompletionReader {
  read(handle: WorkerHandle): Promise<Result<CompletionEvidence>>;
}
```

Do not force asynchronous native reads through nested `spawnSync` helper programs. Existing synchronous consumers needing live data become asynchronous at their I/O orchestration boundary; pure consumers remain synchronous. Reuse one planning snapshot per command, passed through related claim/board/tree reads. This snapshot never authorizes a later mutation: see the coordination contract below. Each consuming increment inventories and tests its propagated async signatures; never hide repeated native calls inside a getter. Phase 2 does not migrate unused board/crew consumers. A provider that can do only local sync work can still satisfy the async port.

Split interface files if they become unrelated concepts. No omnibus provider with launch, files, updates, policy and logging methods. `WorkerHandle` includes source-qualified session reference, the exact owned turn/generation, stable run/target/slot reservation key, repository/workspace, and pinned release. A normal terminal launch returns its plan/terminal acknowledgement only; it never fabricates a session or owned worker handle. Its native implementation data remains in the adapter's owned record, not in board rows.

## Runtime and identity

Resolve from an explicit validated host binding first, then verified runtime environment. Codex currently exports `CODEX_THREAD_ID`; Claude uses `CLAUDE_CODE_SESSION_ID`. `CODEX_SESSION_ID` is not an assumed interchangeable fallback. Conflicting evidence is an error, not a guessed default. Legacy API callers/tests that explicitly choose the Claude adapter preserve current behavior.

Host bootstrap records the selected release and runtime/session ID. Hook `session_id` mapping to the shell identity, parent/subagent behavior and supported environments must be proved before Phase 4 hook activation; this does not block implementing the adapter. Missing identity refuses claim ownership rather than creating a synthetic ID. One identity resolver supplies all claim, board, tree and overseer callers.

## Execution-source identity

A SourceRef identifies a configured execution environment, not merely a product name. Its stable opaque key maps to endpoint/home/auth in adapter configuration. Persist it on sessions, claims, overseers and worker handles and route coverage/control through it. Local relocation must explicitly rebind the key; never silently resolve a historical worker through the current process's default daemon. Remote payloads retain existing host/user identity and qualify the local source within that host. Native-ID equality is one shared source+ID operation used by every join, self-exclusion, mirror, takeover and release path.

Support for multiple sources is enabled only after coverage/discovery probes pass. An ambiguous or unknown source refuses managed mutation before any side effects; one healthy Codex source cannot certify a different unavailable source. A single-source installation remains simple and needs no broker or service registry.

## Session coverage and normalized liveness

- Preserve normalized `cwd`, session state, display name, update time and Claude parked-session semantics. The new boundary RuntimeSession carries the qualified ref; the existing Claude LiveSession is adapter input, not a source-qualified DTO by assumption. Preserve native name/change-time information through explicit normalized fields as required by consumers. Only the Claude adapter requires PID/start-time metadata; never fabricate Codex PIDs.
- Codex `thread/loaded/list` is live discovery, with full pagination. Follow with status reads. Historic `thread/list` is useful for reconciliation, not proof that a thread is active.
- Map native `active` to busy; attention flags to awaiting approval/input; loaded `idle` to idle. Unknown native states and transport errors remain unknown. `notLoaded`, a missing row, interruption and failure never imply successful completion.
- Coverage is complete only for the supported, configured execution environments. The current session must be observed under its resolved ID before claim-taking is enabled. An alternate daemon/home, remote host or no-daemon session is supported only if the provider can cover it; otherwise the host capability check refuses managed ownership explicitly.
- Composition keeps successful source observations when another fails. Claim liveness uses that claim's exact SourceRef coverage; worktree-free/prune decisions require complete or verified-absent coverage of every participating source. Do not silently turn an absent installation into a failing required dependency, or an unavailable configured service into an empty list.
- Source participation comes from explicit runtime configuration plus persisted claims, owned launch records and active spec registrations, not executable existence alone. Unknown records for an unavailable source prevent release/prune until reconciled.

## Storage and mixed-version compatibility

Reuse `<git-common-dir>/spec-board/` and existing exclusive/compare-and-remove primitives. Add schema-versioned codecs for claims, remote payloads, takeover references, run-file overseer identity and launched entries. New records persist runtime identity and launch ownership. Legacy records without runtime decode as Claude; malformed or unknown runtime versions remain unknown, never default to Claude.

`Claim` currently stores naked `sessionId` (`claims/store.ts:9–19`); `claimStatus` and takeover/release equality use it directly. Phase 2b updates every claim equality/release path and remote serialization to the same normalized session reference. Phase 3b migrates `LaunchedEntry`, which currently has only `id`, `title`, `at` (`crew/run-state.ts:18–22`): routing solely from the current overseer's runtime is forbidden. Preserve unknown run-file sections and use existing section writers; no bulk rewrite of stored state or completed specs.

**Phase 2b activation: additive fields alone are not safe with old readers.** Version 2.51.0 can misjudge an unseen Codex claim as closed. Introduce a repository writer-contract floor plus an enforceable managed-entry/installation cutover, proved before mixed-runtime activation. Codex claim/worker activation requires all participating spec sessions to use the dual-runtime writer contract; unknown/older live sessions cause a clear restart request before mutation. Claude-only operation remains available unchanged until mixed-runtime enablement. Rolling back below that floor requires no live Codex workers or runtime-qualified claims, or an explicit reviewed state migration; otherwise retain the compatible release. The supported transition has these explicit limits:

1. For the initial incompatible writer-contract transition only, close or fence incompatible older spec sessions and select a compatible writer contract in every supported runtime installation before enabling mixed writes. Compatible plugin release versions can otherwise coexist normally. Persist the required writer contract and observed installation/source identities.
2. Every supported entry route (fresh CLI/desktop entry, native resume, normal/background launch and maintenance/prune) must verify that the tools it will execute satisfy the floor. Prove that an old cached session cannot reenter through those routes without a restart/refusal. If native resume bypasses the fence, mixed-runtime activation is blocked until a different enforceable entry strategy is reviewed.
3. A file marker is not enforcement: execute the actual 2.51.0 claim/prune reader in compatibility fixtures to prove the hazard and test the selected fence/cutover. Do not try to protect occupancy by making claim files merely unreadable: existing heldClaims drops unreadable rows.
4. Arbitrary manual invocation of historical cached tools outside managed routes cannot be prevented by new code; it is explicitly unsupported. Do not claim safe old/new coexistence. Detectable old-writer reentry freezes new managed mutations and reports the required restart; it does not repair work silently.
5. Rollback below the floor is refused while incompatible live state remains. No legacy-visible fake session/PID reservations and no bulk rewrite of old claims.

Include equal native-ID fixtures across different runtimes AND different sources of the same runtime, including board attribution, self-exclusion, remote mirrors, parked sessions and crew control.

Board JSON fields that gain runtime or source-health information require an explicit schema-version decision and compatibility fixtures. Do not bump versions merely for internal refactoring or change the text lanes' existing meaning.

## Coordination at mutation boundaries

Planning reads may share a snapshot. Stale takeover, workspace placement/managed entry, pruning and worker-target reservation require a fresh bounded read at the mutation boundary under repository/workspace coordination. Reuse/extract existing exclusive/compare-and-remove mechanisms with owner fencing; do not add a database. A lock has an invocation-unique token/generation, not session ID alone. Never expire an uncertain active operation solely by elapsed time.

Managed claim/entry/launch and prune participate in the same workspace coordination contract. After acquiring the relevant lease, reread claim content and source coverage/occupation before applying a destructive change; invalidate stale previews. Uncoordinated arbitrary native/manual processes are outside this mutual-exclusion guarantee, and the adapter may not claim to fence them. Complete coverage and a fresh read are necessary even under the lease. Tests interleave a new/resumed managed session between discovery and removal.

For Phase 3b crew activation, atomically reserve `(repository, run, phase-or-PR-target)` and one numbered slot before placement/external launch. Different invocation IDs do not permit duplicate target reservations. Persist run generation and merge/CAS state changes instead of overwriting another controller's writes. Two concurrent ticks cannot reserve the same target or exceed caps. Interrupted starting/unknown reservations hold capacity until authoritative reconciliation; release only a proved non-started operation.

Stopping transitions are `stopping`, `archive-pending`, `control-outcome-unknown`, then acknowledged closed. Tick ports return typed results; a failed stop/archive does not remove the launched entry or free its slot. This is a narrowly documented correction to current stop-as-void failure handling for both adapters, not a rewrite of crew success policy.

Completion evidence and control are fenced to the recorded owned turn/generation. A fresh observation of later unowned activity in the same thread prevents automatic interruption/archive and reports attention. Never use that continuation's final text as evidence for the original worker.

## Concrete integration seams

Phase 2b injects composed session reads at `board/load.ts`, `commands/claim.ts`, `claims/live.ts`, `trees/place.ts` and `trees/prune.ts`, wired from their existing system factories and context's held reader. Phase 3b wires `crew/deps.ts`/`systemCrewDeps` when workers consume the same composition. Tests inject fixtures; none reads the developer's real ~/.codex state by default.

The context input/render separation and narrow `ContextDeps`/`PlacementDeps` extractions are completed foundations. Reuse the existing async loading → plain held/pack values → pure rendering/selection chain. The remaining `launchCommand` dependency extraction belongs in Phase 3; keep request/options separate and Claude fixtures green.

Phase 2b identity migration touches `trees/find.ts`, `claims/held.ts`, `board/joins.ts`, `board/attribution.ts` and `claims/remote-take.ts`; `crew/overseer.ts` and worker-run identity move with Phase 3b. No raw-ID comparison may remain in identity joins merely because the new codecs are correct.

Launch keeps the existing terminal selection/rendering. Runtime selection is passed explicitly into the launch plan. The Claude adapter preserves `claude -n ...` and the existing background CLI contracts. Codex uses native skill syntax/explicit skill input, configured model/permissions and a proven client connection. Never translate `opus` into a guessed Codex model or copy Claude permission flags into Codex.

Crew policy keeps its current ownership filter, slot limits, parking, PR babysitting and close-out rules. Only roster, launch/control, CLI version and completion evidence are substituted. A mixed-runtime run routes each worker by its persisted handle. Archive is not delete; preserve native history/worktrees and never act on arbitrary sessions returned by a global list.

## Codex native boundary — proof required

Native observations on 0.167.0 are recorded in research. The initial established-library Unix WebSocket probe succeeded and proxy JSONL did not respond; Phase 1 subsequently proved native Bun Unix WebSocket on installed 1.4.4 for the configured source. Reuse that bounded result and existing transport instead of repeating library/platform research. Verify the configured endpoint when binding actual execution; record any genuinely necessary change. Broader hosts remain unproved.

Candidate lifecycle: `thread/start` → explicit name and canonical skill binding → `turn/start`; read via `thread/read`, `thread/loaded/list`, `thread/turns/list`, `thread/items/list`; control via `turn/interrupt` and `thread/archive`. The read-only probe did not exercise these writes. Disconnect survival, process-tree cancellation, pending approvals/questions and restart recovery must be proved before Phase 3b enables crew actions.

Lifecycle records: planned → starting → running → attention / finished / failed / interrupted → verified close-out → archived. A lost launch response is `outcome-unknown`, not failed/retryable. Persist the launch key before calling out; use existing atomic state helpers. Hold the slot until authoritative reconciliation identifies the worker. No blind retry of thread creation. An archive attempt never runs while an unacknowledged active turn or child process remains.

Phase 1 observed a yielded model exec surviving turn interruption on configured 0.167.0; exact native `thread/backgroundTerminals/terminate` then removed its marked parent/child/grandchild. Native terminal process IDs are not OS PIDs. Future worker control must account for yielded terminals and verify cleanup separately before archive/capacity release. This bounded single-source proof does not establish detached-process, approval-enabled or daemon-restart support; see `ledger/gotcha-native-interrupt-needs-terminal-cleanup.md`.

Completion evidence comes from the newest relevant owned turn. Native item pages contain wrappers `{turnId,item,...}`; assistant text is `item.text` for `item.type === "agentMessage"`. Prefer a final-phase report, but retain existing handoff/git/claim evidence requirements. Bound history reads, paginate explicitly and never infer completion from transport disconnect.

## Native skill, persona and hook binding

Keep canonical workflows/personas shared. Host entrypoints own syntax and tool mapping only. Phase 2 introduces minimum Codex bootstrap; Phase 4 completes mode/persona/hook binding. Bootstrap explicitly runs context/taxonomy/playbook setup and makes the runtime selected release available to commands; Claude's existing interpolation and skill-frontmatter hooks remain the compatibility path.

Register Codex lifecycle hooks through the Codex plugin manifest using a plugin-owned file outside Claude's default hook discovery path. Do not accidentally register duplicate global hooks for Claude. Native hook commands resolve `PLUGIN_ROOT`/compatibility root; never reference a user's home path or personal migration bridge.

Hook activity is gated by a spec-session registration keyed to the runtime session identity. Ordinary sessions produce no spec context or extra guard child processes beyond a minimal registration check. Clear/expire registrations at validated session end/explicit handoff policy, not every Stop event. Failed registration is reported; correctness-critical missing validation is not silently represented as active.

The adapter extracts all edited, added, deleted and moved paths from native patch payloads and reuses existing recall and file-check functions. Spec validation reads the resulting files after edit and emits model-visible native PostToolUse feedback; it cannot pretend to undo an applied edit. Recall remains pre-edit, per-session deduplicated and bounded. Tests must prove hook invocation in a fresh native session; testing the pure hook function is insufficient.

Review host binding resolves project overrides before plugin personas. When native roles are unavailable, use a built-in agent with the canonical persona explicitly loaded; never assume bundled Markdown defines a native custom agent. Any managed TOML wrappers use an owned namespace and manifest, never overwrite project/user roles, and update with the candidate release. All five review lenses must be present, including code-quality-reviewer. Do not introduce wrappers unless the capability probe shows they add value over explicit persona loading.

## Native packaging and existing release process

Use the existing manifests, marketplace metadata and scripts/version.py. Phase 2 ships minimum Codex entry/assets; Phase 4 adds complete native hooks/bindings and remaining required files. Keep paths relative to the plugin and avoid personal bridges or development checkouts. Check manifest/version agreement using existing checks.

The hosts own plugin installation, version selection and updates. Add no updater, freshness polling, coalescing helper, release-state records, scheduler, activation coordinator or diagnostic subsystem. Normal native install/discovery and hook review are acceptance checks in pr-opening.md. Use fresh-session recovery when an update invalidates an old helper path; retention is deferred.

Historical native installation/resource observations stay immutable. They establish limits, not a requirement to build replacement host machinery. Ownership compatibility and native hook trust remain gates on the respective implemented capabilities.

## File organization and structural gates

Reuse `tools/runtime/identity.ts`, `resolve-identity.ts`, `sessions.ts` (values), `read-sessions.ts` (composition), existing configured context commands and concrete `claude/`/`codex/` adapters. Add only capability-owned launch/worker/evidence wiring that its increment needs; illustrative `contracts.ts`/`system.ts` names are not new required layers. Hook host translation stays under `tools/hooks/`; normal release/version checks stay in the existing `scripts/`; no new update subsystem.

Every new non-data file ≤250 lines, function ≤50 lines, ≤4 parameters; split before extending an oversized touched unit. Pure mapping/policy tests need no native daemon. All boundary types are plain plugin values; wire/SDK objects stay inside adapters. Run the focused phase preflight before coding each phase; its source recon resolves concrete filenames and dependency choices, not new business decisions.
