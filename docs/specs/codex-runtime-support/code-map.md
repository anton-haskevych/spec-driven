# Code map

Existing seam inventory began at 22e7ec7 on 2026-11-08; introduced/touched rows below include subsequent Phase 1/2 work through 13a61f9. Historical source line references can drift. `T` = `skills/spec/tools/`.

## Remaining work by delivery

| Phase | Integration owner |
|---|---|
| 2 | Entry/assets and guards are composed; finish historical prune-isolation proof, explicit validation and installed-candidate/local-cycle acceptance |
| 2b | Claim codecs/mutations/remote joins, board/list, tree placement/prune and their shared system composition |
| 4 | All interactive mode/persona/project-override binding, complete managed handoff and native hook/manifest assets |
| 3 | Normal launch planning/terminal binding, next sessions, spin-offs and interactive babysitter launches |
| 3b | Background/control/evidence adapters, overseer and worker/run identity, crew lifecycle/reconciliation |
| 6 | Existing feature-owned suites consolidated into full parity/CI/release evidence |

The six Phase 2 foundations and connected-entry chunk stay implemented; do not rebuild their abstractions. Pilot commands are guarded before the context override/default registry, and raw Codex executable use refuses. workflow-parity.md owns the full feature inventory. Tests/native evidence accompany their feature; final consolidation is not deferred basic verification.

## Existing seams

| Existing file / seam | Current role | Planned change |
|---|---|---|
| `T/core/run.ts` | Runner, AsyncRunner and bounded command execution | Reuse for existing CLI edges; avoid new subprocess framework |
| `T/core/git.ts` | Git and shared state roots | Reuse state ownership |
| `T/claims/atomic-file.ts` | Exclusive writes and compare/remove | Reuse locks/owned state coordination |
| `T/sessions/own.ts:3` | Claude-only own identity | One runtime-qualified resolver |
| `T/sessions/live.ts:15,65` | Claude file and PID liveness | Preserve as Claude adapter; separate normalized contract |
| `T/board/load.ts:57` | Board live snapshot | Inject coverage-aware composition |
| `T/commands/claim.ts:71` | Claim-world read | Inject snapshot and qualified identity |
| `T/claims/live.ts:26` | Other-session held phase read | Inject snapshot |
| `T/claims/store.ts:9,41,62` | Claim codec, take and release | Versioned runtime identity and compatibility guards |
| `T/trees/find.ts:84–95`, `T/claims/held.ts:31–41` | Self-exclusion and remote mirror/takeover joins | Source-qualified identity equality |
| `T/board/joins.ts`, `T/board/attribution.ts`, `T/claims/remote-take.ts`, `T/crew/overseer.ts` | Attribution, takeover and overseer ownership | Same source-qualified comparison helper |
| `T/claims/rules.ts:35` | Liveness and stale decisions | Coverage-aware shared policy |
| `T/claims/remote-payload.ts` | Cross-machine claim payload | Backward-compatible runtime codec |
| `T/trees/place.ts:121` | Occupation before placement | Complete-source requirement |
| `T/trees/prune.ts:47` | Safe cleanup | Preserve unknown-source work |
| `T/commands/board.ts` | Board system factory | Compose readers here |
| `T/commands/trees.ts:23` | Placement system factory | Compose readers here |
| `T/commands/context.ts:35` | Independent held-reader wiring | Same composition; no hidden host-state test reads |
| `T/crew/deps.ts:21` | Crew system composition | Inject narrow lifecycle/evidence ports |
| `T/launch/command-line.ts:18` | Claude normal command and prompt | Runtime-specific launch plan, shared argument validation |
| `T/launch/terminal.ts` | tmux/iTerm/Terminal behavior | Keep runtime-neutral |
| `T/launch/background.ts:13` | Claude --bg launch/parser | Claude adapter plus Codex lifecycle implementation |
| `T/commands/launch.ts:23` | Placement then launch orchestration | Capability check before any placement/brief writes |
| `T/sessions/agents.ts:28` | Claude roster | Runtime-normalized roster source |
| `T/sessions/transcript.ts:9` | Claude completion text | Preserve Claude evidence edge; add native Codex evidence edge |
| `T/crew/close-out-run.ts:37` | Shared completion policy | Inject evidence, preserve policy |
| `T/commands/crew/tick.ts` | Current direct stop/rm and roster calls | Route owned handles to adapters |
| `T/crew/run-state.ts:18` | Unqualified launched IDs | Versioned owned runtime handles |
| `T/hooks/lesson-recall.ts:14` | Claude payload recall | Shared recall plus Codex patch envelope adapter |
| `T/hooks/spec-file-check.ts` | After-edit file validation | Native model-visible feedback; unchanged Claude path |
| `skills/spec/SKILL.md` and mode files | Canonical workflow | Explicit host bootstrap/binding, no policy forks |
| `agents/*.md` | Seven canonical personas | Native binding/project override preservation |
| `.codex-plugin/plugin.json` | Current metadata-only native manifest | Versioned native entry/hook assets |
| `scripts/version.py` | Three version declarations | Extend only for real published artifacts |
| `.github/workflows/plugin-metadata.yml` | Versions, Bun tests, type-check | Add compatibility/packaging drift gates |

Existing tests to extend: `sessions-own`, `sessions-live`, `sessions-agents`, `sessions-transcript`, `claim-command`, `claims-live`, `claims-rules`, `board-claims`, `sessions-by-workspace`, `trees-place-owner`, `trees-prune`, `launch`, `launch-background`, `crew-launch`, `crew-wait`, `crew-tick`, `crew-check`, `hook` and `skill-wiring`.

Prior art outside this repo: `../plugin-publish/SKILL.md` has the scoped native refresh/install/verification procedure. Its broad sync helper refreshes all marketplaces, so do not invoke that blanket operation for this spec. Any necessary companion change must stay scoped and be declared during phase recon.

## Introduced by this spec

| File | Role | Phase |
|---|---|---|
| `T/runtime/sessions.ts` | Plain source/session/coverage values; shared status/name type exports | phase 1 |
| `T/runtime/claude/sessions.ts` | Pure opt-in mapping of the unchanged Claude reader result | phase 1 |
| `T/runtime/capabilities.ts` | Observed/unverified/unsupported/unavailable outcomes; managed features stay unverified | phase 1 |
| `T/runtime/codex/probe.ts` | Explicit bounded read-only version/endpoint/identity proof; sanitized agent report | phase 1 |
| `T/runtime/codex/transport.ts` | Read-only facade preserving write-method refusal | phase 1 |
| `T/runtime/codex/probe-rpc.ts` | Shared bounded Unix WebSocket probe transport, explicit experimental opt-in and native event observation; no production control wiring | phase 1 |
| `T/tests/fixtures/codex-lifecycle/` | Actual owned lifecycle observations and hashed finite process fixture; no native writes in default tests | phase 1 |
| `T/tests/fixtures/codex-install/` | Actual isolated install/catalog/untrusted-hook/cache-eviction observations; active model and native resume remain unproved | phase 1 |
| `T/tests/fixtures/codex-resource-execution/`, `T/tests/runtime-codex-resource-execution.test.ts` | Actual native old-path shell failure across update, fresh candidate success, hashed historical script and explicit authentication/model limits | phase 1 |
| `T/runtime/codex/scan.ts`, `decode.ts` | Paginated current-source scan and conservative native response decoding | phase 1 |
| `T/tests/fixtures/runtime-2.51.0/` | Actual historical claim/occupancy/prune modules, reversible import relocation and hashes | phase 1 |
| `T/runtime/identity.ts`, `resolve-identity.ts` | Shared source/session equality and keys; explicit initiating identity with configured-source/conflict refusals; opt-in pending command integration | phase 2 |
| `T/runtime/read-sessions.ts` | Async injected source composition, read once per source, bound coverage checks and healthy-source retention | phase 2 |
| `T/runtime/codex/sessions.ts` | Source-bound injected connect/scan/close reader reusing the existing paginated scanner | phase 2 |
| `T/tests/runtime-identity.test.ts`, `runtime-read-sessions.test.ts`, `runtime-session-readers.test.ts` | Identity collisions/conflicts, per-source failures and attribution, fixture-only host reader lifecycle | phase 2 |
| `T/context/references.ts`, `select-phase.ts` | Loaded optional spec references and pure execute phase selection; renderers perform no file reads | phase 2 |
| `T/trees/place-system.ts` | Legacy Claude system adapter for narrow PlacementDeps; loading, addition/setup and dirty checks stay outside placement policy | phase 2 |
| `T/claims/snapshot-held.ts` | Pure qualified claim-to-held-phase policy; exact-source unknown coverage remains held | phase 2 |
| `T/commands/runtime-context.ts` | Opt-in read-only shared context composition: explicit identity/configured readers and one claim/inference input; no default CLI/native config wiring | phase 2 |
| `T/claims/document.ts`, `T/claims/read-documents.ts` | Read-only schema-1/explicitly bound legacy claim documents; raw unknown-field retention, conservative directory/record failures; no writer activation | phase 2 |
| `T/commands/stored-runtime-context.ts` | Configured context backed by common claims storage; same rows feed inference/held phases and an optional read-only caller check (pilot refuses stored claims) | phase 2 |
| `T/tests/claims-document.test.ts`, `claims-read-documents.test.ts`, `context-stored-runtime.test.ts` | Decoder, filesystem refusal/byte preservation and opt-in dispatcher integration using disposable Git/worktree/source fixtures | phase 2 |
| `T/tests/context-runtime.test.ts`, `claims-snapshot-held.test.ts`, `context-async.test.ts`, `context-rendering.test.ts`, `trees-placement-ports.test.ts` | Fixture evidence for qualified phase picking, read-once snapshots, pure rendering and narrow placement ports | phase 2 |
| `T/runtime/workflow-capabilities.ts`, `skills/spec/capabilities.md` | One pilot command/sub-action policy and canonical automatic mode limits; no Claude default restriction | phase 2 |
| `T/codex.ts`, `runtime/codex/entry.ts`, `skills/spec/native-entry.md` | Source-packaged explicit request/candidate/identity/cwd bootstrap to existing stored context; one native snapshot, local restricted reporting | phase 2 |
| `T/runtime/codex/candidate.ts`, `runtime/pilot-workspace.ts` | Actual asset content fingerprint without installed Git; read-only common-directory/exclusive-checkout checks, not full isolation acceptance | phase 2 |
| `T/tests/{workflow-capabilities,pilot-workspace,codex-entry,codex-candidate,codex-packaged-entry}.test.ts` | Guard/refusal tests and copied-package CLI execution through a disposable daemon fixture; no live install or model acceptance | phase 2 |

## Existing files touched

| File | Why we care | Ledger |
|---|---|---|
| `T/sessions/live.ts` | Re-exports shared status/name types; reader behavior stays unchanged | `ledger/decision-runtime-boundaries.md` |
| `tsconfig.json`, `.github/workflows/plugin-metadata.yml` | Bun-only type environment and locally verified Bun 1.4.4 CI runtime | `ledger/gotcha-bun-docs-exceed-installed-api.md` |
| `T/runtime/claude/sessions.ts`, `runtime/sessions.ts` | Injected Claude reader wraps unchanged normalization; narrow Claude/Codex source types | `ledger/decision-runtime-boundaries.md` |
| `T/runtime/codex/scan.ts`, `decode.ts` | Codex source type prevents a Claude label at the native boundary | `ledger/decision-runtime-boundaries.md` |
| `T/commands/context.ts`, `context/packs.ts` | Async ContextDeps boundary and pure pack rendering; default system path remains Claude-only | `ledger/decision-runtime-boundaries.md` |
| `T/spec.ts`, `skills/spec/{SKILL,execute,handoff,update}.md` | Context override plus pre-dispatch pilot guards and shared automatic-action contract; raw Codex executable refuses, Claude path unchanged | `ledger/decision-runtime-boundaries.md` |
| `.codex-plugin/plugin.json`, `T/runtime/capabilities.ts` | Explicit relative skills packaging; native-installation evidence replaces obsolete updater/retention capability wording | `ledger/decision-source-based-immutable-releases.md` |
| `T/trees/place.ts`, `commands/trees.ts`, `commands/launch.ts`, `commands/crew/{launch,tick}.ts` | Request + narrow PlacementDeps; legacy PlaceDeps type retained for prune/historical fixture compatibility | `ledger/decision-runtime-boundaries.md` |
