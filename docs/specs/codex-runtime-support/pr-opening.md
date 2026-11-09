# PR opening and release gates

## Current state

Draft specification only. Phase sequence approved by Anton on 2026-11-08; design/implementation and public release are not approved yet. All implementation boxes remain unchecked. No source, installed plugin, settings, model defaults or daemon processes were modified during spec creation.

## PR groups

| Group | Phases | Purpose |
|---|---|---|
| A | 1–2 | Proven boundaries, Claude baseline and safe cross-runtime ownership |
| B | 3–4 | Operational Codex lifecycle and native workflow binding |
| C | 5–6 | Durable distribution, update coordination and compatibility enforcement |

Groups land in order. Each is a coherent tested change; no PR claims full parity until the entire acceptance matrix passes. Follow `docs/specs/_playbook/settings.md`: ready PRs, squash merge. No direct implementation commits to main. Choose the release version from main at merge using `scripts/version.py`; do not pre-bump to a guessed latest number. This spec-writing session creates no branch, PR, push, release or live install.

## Acceptance matrix

| Scenario | Required evidence |
|---|---|
| Claude existing loop | Same prep/review/execute/handoff and launch/crew/claim/hook behavior against baseline fixtures and native smoke |
| Codex fresh install | Packaged release discovers intended skill/native hooks/assets with no dependency on Claude installation or personal bridge |
| Codex four-command loop | Context and project overrides load; a real phase can be claimed, worked and handed off through the shared policy |
| Review | All five canonical lenses loaded, project overrides respected, no invalid Claude model names passed to Codex |
| Plain sessions | No spec context, claims or expensive guard children until spec entry |
| Hook protocol | Actual native patch calls trigger recall and after-edit spec validation, including multi-file/move and malformed payloads |
| Mixed sessions | Claude and Codex see the same phase ownership/occupied trees; equal native IDs do not collide |
| Source failures | Partial/unreadable/paginated/unknown states retain healthy rows and never justify takeover/prune |
| Legacy state | Legacy Claude claims/run files decode; unknown schema/runtime stays unknown; all equality/release/remote paths are qualified |
| Concurrent mutation | Managed resume after planning snapshot cannot race prune; simultaneous ticks cannot reserve one target or exceed worker caps |
| Acknowledged close-out | Failed/lost stop or archive retains owned records/slots; user continuation on another turn is never controlled automatically |
| Mixed old versions | Proven managed-route cutover fences old native resumes; actual legacy-reader claim/prune tests demonstrate protection; arbitrary manual historical code is unsupported; downgrade refuses incompatible live state |
| Worker persistence | Native worker continues after launch-client disconnect, reconnects and survives controller restart |
| Worker attention | Approval/input waits are distinguishable from completion, error and disconnection |
| Worker stop | Exact owned turn interrupted; child processes cleaned up; archive preserves history/worktrees and never touches unrelated sessions |
| Worker retries | Lost responses, repeated ticks and restarts do not create duplicate workers; unknown launch outcomes keep their slot |
| Completion | Native final assistant evidence is correctly paginated/wrapped and existing git/handoff/released-claim checks remain enforced |
| Update current | Native refresh/install/reconcile selects verified version+revision+content; fresh session reports what it actually loaded |
| Update failures | Offline, incompatible/corrupt candidate, partial install, concurrent check and trust-required cases preserve last good release |
| In-progress update | Active sessions keep pinned tools/hooks; new catalog activates only in a fresh session |
| Reinstall/update durability | Reinstallation erases no required adaptation because all runtime behavior ships in source artifacts |
| Host limits | Alternate homes, unsupported daemons/no-daemon/remote hosts are capability-tested or clearly refused, never advertised as complete coverage |

## Pre-PR checks

- [ ] Phase design gate approved; per-phase recon and phase-preflight complete before coding.
- [ ] `bun test`, `bun run typecheck`, `python3 scripts/version.py` and frozen install pass.
- [ ] New/touched units satisfy structural size/function/parameter and import-boundary gates; no double casts or hand-written transport protocol.
- [ ] Source adapters pass shared behavior tests with no host-state reads in unit tests.
- [ ] Each supported native surface has controlled, scrubbed integration evidence and fixture cleanup.
- [ ] Doctor/graph/phase references are clean; code-map and phase-specific learnings current.
- [ ] No skipped capability probe is counted as passing parity; unresolved invariants park implementation.

## Rollout approval — after implementation

- [ ] Anton approves publishing the ready PR/release and the specific personal install/update integration changes.
- [ ] Record installed Claude/Codex versions, existing cache modifications and active session/claim state; preserve recoverable source/config backup.
- [ ] Establish writer-contract-compatible fresh sessions before enabling mixed-runtime writes.
- [ ] Publish through the existing release/version workflow; update the two host installations through supported operations and verify their exact active revision.
- [ ] Verify new hook trust through native review; no bypass flags or forged hashes.
- [ ] Run the acceptance harness on the actual selected release; report any unsupported surfaces accurately.
- [ ] Remove migration-only cached adaptations when source-based replacement passes; keep unrelated harness work intact.
- [ ] Exercise rollback within the compatible writer floor and retain previous artifacts until active sessions are gone.

## Planning review

Five independent reviewers completed the initial design review. All recommended fix-then-proceed. Sixteen findings were consolidated into eleven verified/design amendments, applied in this spec; immutable synthesis: `reviews/2026-11-08-dual-runtime-boundaries.md`. Phase-1 capability/cutover probes and Anton’s final design approval remain gates, not completed implementation evidence.

Targeted principal/adversarial recheck found no remaining high blockers for phase 1 proof work: `reviews/2026-11-08-proof-gates-recheck.md`. This does not authorize enabling later capabilities or skip final design approval.
