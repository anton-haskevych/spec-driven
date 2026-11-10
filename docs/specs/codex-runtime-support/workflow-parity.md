# Required workflow parity

This is the final scope, not a list of optional improvements. Anton uses the full Claude plugin daily and requires it on Codex. Incremental releases expose only proved capabilities; this spec is complete only when every row below has passing evidence. Preserve all existing Claude behavior and approval rules throughout. Clear shared improvements need explicit intent and regression coverage.

Inventory baseline: the 12 public modes in skills/spec/SKILL.md and 21 command families in skills/spec/tools/spec.ts at 6eeb4e1. Phase 6 reconciles this inventory against the then-current canonical plugin so features added during the port are not lost. Evidence is recorded by feature-owned fixtures/native results and consolidated in the release evidence manifest; a phase number or unchecked plan is not proof.

## Public modes

| Existing mode | Owning phase | Required Codex evidence |
|---|---|---|
| prep | 4; spin-off/launch in 3 | Brief/recon, project context, existing stops and fresh-session handoff |
| create | 4 | Full spec/phase/ledger generation, taxonomy and design approval behavior |
| resume | 2 pilot; full 4 | Stage A halt, selected Stage B, inference, in-flight and scoped context |
| execute | 2 pilot; managed 2b + 4 | Real work, preflight/recon, checks/commits, progress, claims and stop rules |
| review | 4 | All five canonical lenses, overrides, synthesis/forks, immutable findings and application |
| update | 4 | Phase ticks, code-map and durable learnings without handoff-log drift |
| handoff | 2 local pilot; full 2b + 4; next launches 3 | Ledger/in-flight, doctor, commit, authorized remote publication, claim release, safe cleanup and fresh pickup |
| status | 4 | Existing phase/status/delivery/work table and task/dependency semantics |
| list | 2b + 4 | Existing board/backlog/filter/owner/focus/JSON behavior |
| idea | 4 | Capture/close/drop/promote backlog items through existing rules |
| babysit | 3 interactive; 3b unattended | CI wait/fix, exact-head merge/hold, review evidence and ownership close-out under existing authorization |
| oversee-crew | 3b | Ready work, worker/babysitter caps, parking, reconciliation, completion and rotation |

## Agent-operated command families

Runtime-neutral tools keep their implementations; native invocation and regression coverage prove reuse. Grouping below accounts for all 21 families.

| Existing command family | Owning phase | Required evidence |
|---|---|---|
| context | 2; shared 2b | Correct native identity/source, read-once inputs, inference, selection and unknown coverage |
| claim | 2b | Qualified local/remote take, release, takeover, legacy compatibility and existing authorization |
| board, list | 2b | Same lanes, focus/people/owner filters, source-correct joins and versioned JSON |
| trees | 2b | Placement/busy refusal, bootstrap/setup, coordinated safe prune and root/ownership behavior |
| launch | 3; background 3b | Correct runtime/cwd/skill/release, terminal semantics and owned background handles |
| crew | 3b | start/launch/wait/check/tick/close-out, overseer and worker records, no lost/duplicate work |
| doctor, lessons, graph, ready, gates, playbooks, phase, settings | 2 explicit pilot checks; full 4 | Existing validation, recall, graph/dependency, taxonomy/playbook/gate and progress behavior |
| focus, ship, owner | 4 | Same agent-operated changes, user intent/ownership and existing remote safety |
| pr, push, publish-docs | 4 tooling; babysit 3/3b | Existing CI/hold/merge, scoped publication and approvals; no new automatic authorization |

## Cross-mode contracts

| Existing behavior | Owning phase | Required evidence |
|---|---|---|
| Native skill discovery, aliases and request binding | 2 then 4 | Executed packaged candidate/assets, actual user request and explicit bootstrap |
| Project overrides, taxonomy, tag playbooks, ledgers and journals | 4 | Same precedence and existing document locations; no bulk migration |
| All seven canonical agents and recon/preflight invocation | 4 | Five review personas, debugger and deep-research-analyst with canonical instructions/project overrides and native tool/model binding |
| Next-session suggestions, numeric replies and fresh-session stop rules | 3 | Same selected work, host-correct launch, accurate refusal and no duplicate sessions |
| Spin-offs and dependency links | 3 | Seed/research/context retained; correct new-session spec/cwd |
| PR auto/hold/review and existing ship/approval policy | 3 and 3b | Same decisions and allowed actions in interactive and unattended paths |
| Scoped recall and spec validation hooks | 4 | Actual trusted native pre/post invocation, all patch paths, invalid-edit feedback and bounded dedup |
| Plain sessions | every binding change | No spec context/claims or expensive guard children before spec entry; Claude overhead unchanged |
| Mixed ownership and occupied worktrees | 2b | Healthy rows retained, source-qualified equal IDs, unknown held, remote rules and mutation-time races |
| Legacy transition and rollback | 2b; worker records 3b | Actual historical-reader hazards, enforceable supported cutover and compatible rollback limits |
| Owned background lifecycle | 3b | Disconnect/restart, attention, target/slot races, exact-turn evidence/control, yielded cleanup and acknowledged stop/archive |
| Native install/update/reinstall | 2 minimum; 4 hooks; 6 closure | Source-contained assets, existing release mechanisms, native trust and fresh-session recovery |
| Supported host/version reporting | each enabled feature; closure 6 | Tested configurations and explicit limits; no skipped native scenario counted as passed |

## Completion rule

Phase 2's isolated pilot is useful early adoption, not completion of execute/handoff parity. All missing capabilities above stay required in this spec. Full parity requires real native scenarios as well as deterministic contracts, with Claude regression evidence at every delivery. Unsupported additional environments can remain honestly documented; a missing required feature in a supported environment cannot be relabelled unsupported to close the port.


## Accepted isolated-pilot evidence

Phase 2 acceptance is `research/phase-2/2026-11-09-final-combined-acceptance.md`: one exact combined installed candidate, two actual model sessions, canonical concurrent recon, useful code integration, explicit feedback/correction/update/local handoff and confirmed fresh Stage A/B pickup. This closes only the Phase 2 pilot portions above. Shared ownership/inference, full interactive modes/personas/hooks, publication/cleanup, normal launches and managed workers remain required in their owning phases. The temporary native installation was removed after acceptance; this is source readiness, not permanent personal activation or release.
