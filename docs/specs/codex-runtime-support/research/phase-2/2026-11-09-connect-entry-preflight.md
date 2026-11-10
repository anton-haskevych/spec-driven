# Connect the native entry — preflight

Inputs: Phase 2 “connect the entry”, its adjacent recon note, and `skills/spec/principles.md`. House rules take precedence. Existing context/identity/probe ports remain authoritative.

## Findings that change the plan

1. A context override does not fence commands (`tools/spec.ts:66-70`). Add a shared pilot policy before all dispatch, and refuse the raw executable route from Codex. Tests must observe refusal before injected work, not just compare usage strings.
2. Local command families contain outward actions (`tools/commands/phase.ts:92-107`). Permit only concrete pilot sub-actions; deny deployment/land and unknown commands by default. Do not enable board allocation merely because `ready` is local.
3. A missing phase hint silently chooses another phase (`tools/context/select-phase.ts:12-19`). Entry must require one named existing spec and exact phase, and refuse empty context. Handoff/update may load the existing resume pack while retaining their actual request and mode in the entry report.
4. Catalog/version evidence is insufficient (`tests/runtime-codex-resource-execution.test.ts:43-60`). Report executed canonical root plus a byte-derived asset revision; compare the expected candidate revision before native reads or command work. Installed assets cannot require `.git` or node_modules.
5. The pilot cannot safely start in this inherited sibling tree (`core/git.ts:59-72`; spec design's isolation invariant). Add a narrow read-only common-directory/root check at entry. The full legacy prune fixture and live isolated-cycle acceptance remain pending; no pilot is activated here.

## Clean Code against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names / meaningful distinctions / one concept | Bites | Name pilot dispatch policy separately from observed native capabilities (`runtime/capabilities.ts:3`). |
| Small single-level functions / arguments / flags | Bites | Entry uses request/dependency objects; native mechanics remain in `codex/probe.ts:31`. |
| Side effects / command-query separation | Bites | Hashing, Git inspection and native reads precede `spec.ts:66` dispatch; no writes during binding. |
| Comments / objects versus data / Demeter | Inert | Existing plain data and small ports suffice. |
| Errors / boundaries / Special Case | Bites | Return Result refusals and nonzero native CLI exit; empty `context.ts:77-81` is refusal. |
| TDD / one concept / F.I.R.S.T. | Bites | Pure guard tests, one composed boundary fixture and copied-package fixture; no real daemon. |
| Small classes / SRP / cohesion | Inert | No classes introduced. |
| Beck simple design | Bites | Reuse stored composition and probe; add no broker/provider/updater. |

## Clean Architecture against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule / circles / policy versus detail | Bites | Shared capability policy consumes plain argv/target; native entry composes `createStoredRuntimeContextCommand`, not vice versa. |
| Plain boundary data / humble edge | Bites | Existing `ProbeReport` snapshot and `SessionRef` cross the native edge; RPC objects stay in adapter. |
| REP / CCP / CRP | Bites | Keep native assets and entry together; canonical mode policy stays shared. |
| ADP / SDP / SAP | Bites | `spec.ts` may import pure policy, never the native entry that imports dispatcher. |
| Screaming architecture / outer tests | Bites | Pilot and candidate test names state their limited evidence, not full parity. |

## SOLID against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP by actor | Bites | Runtime binding belongs to native host, allowed actions to workflow policy, unchanged Claude registry to existing commands. |
| OCP | Bites | Phase 2b can add a proved profile without modifying ownership logic in the pilot entry. No general provider framework now. |
| LSP | Bites | An unavailable native source refuses; it never substitutes empty-success context. |
| ISP | Bites | Inject existing Runner/probe ports, not the whole native control surface. |
| DIP | Bites | `spec.ts:66` depends on a policy value and context port; the entry supplies concrete native I/O. |

## DDD against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Ubiquitous language / value objects / invariant owner | Bites | Qualified identity stays in `resolve-identity.ts`; “local restricted handoff” cannot mean claimed/published/cleaned. |
| Aggregate / cross-aggregate / repositories | Inert | No shared writes, worker records or new persistence. |
| Factories / services / policies | Bites | Reuse `createStoredRuntimeContextCommand`; one pure dispatch policy owns temporary limitations. |
| Events / bounded context / ACL / published language | Bites | Reuse probe decoding; preserve source-qualified snapshot wire boundary. |
| Specification / pure assertions | Bites | Exact named target and allowed operation are checked before side effects. |

## Guard blindness and testability delta

Existing command-table and historical asset tests do not prove this entry. New focused fixtures must deliberately fail on missing policy/entry, prove denied handlers are untouched, and run copied candidate code without `.git`/node_modules. No enforcement tightening or unrelated refactor is needed. No additional size obstacle beyond recon.

## Amendments

1. Implement/commit pure dispatch guards and shared mode contract first, with Claude regressions.
2. Bind candidate-content and exact target/isolation checks to the existing native probe and stored context; carry one snapshot.
3. Package explicit native skill discovery and source bootstrap instructions; verify actual copied candidate assets with existing version tooling. No hooks or installer yet.

## Defaults applied

- Only the existing proved local-daemon 0.167.0 source is eligible; alternate homes/environments refuse. No discovery expansion.
- Fail closed on unknown commands/sub-actions and missing target/content/identity evidence. Keep Claude dispatch unchanged.
- Content revision is an invocation report, not persisted release state or an updater. Full native acceptance remains unproved.

## Forks for you

None.
