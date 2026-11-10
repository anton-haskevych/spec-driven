# Design

## The experience

Anton can use the same complete spec workflow in Claude Code or Codex. Claude keeps its current commands and behavior; native binding translates invocation/tool mechanics and uses the same canonical policies, documents and personas. workflow-parity.md defines the full scope.

Deliver the first usable Codex cycle before automated workers. Use that cycle to finish this port. Deferred features remain assigned, required work.

## Delivery boundaries

| Delivery | User value | Boundaries |
|---|---|---|
| Phase 2 | Enter a spec, finish a real code chunk, commit local handoff, resume fresh | Explicit exclusive isolated-clone pilot; unavailable automation is reported and guarded |
| Phases 2b + 4 | Use the normal shared repository and full interactive modes/reviewers/hooks | Proved shared ownership/cutover and real native hook feedback |
| Phase 3 | Launch the correct fresh session, next work, spin-off or interactive babysitter | Native terminal plan/acknowledgement; no invented worker ownership |
| Phase 3b | Run unattended workers, babysitters and overseer | Durable ownership, recovery, attention and safe close-out |
| Phase 6 | Adopt the complete supported port with release enforcement | Every parity row passes; Claude has no regressions |

## Invariants

1. One shared implementation of workflow policy: phase/owner/ship/approval decisions, success, handoff and crew rules are not forked by host.
2. Preserve all Claude features and existing successful behavior. Deliberate improvements carry explicit regression evidence.
3. Resolve initiating runtime/source/session once at composition. Persist qualified identity on every owned launch; never infer a worker backend from the controller environment.
4. Missing/unreadable/incomplete evidence is unknown, never absence or success. Refuse unready operations before side effects.
5. Never stop/archive/interrupt/remove work without proved ownership and current evidence. Completion text does not replace git/push/handoff/released-claim checks.
6. Claude-only users require no Codex daemon. Native source participation is explicit; healthy results survive another source's failure.
7. Native hosts own installation/update selection and trust. Fresh sessions recover from old-path invalidation; no custom updater or retention.
8. The agent performs routine operations; Anton does not run maintenance scripts. Plain sessions receive no spec context or expensive guards before spec entry.
9. A limited increment is labelled accurately. Missing features cannot become permanent omissions or passing parity results.

## Native entry and local pilot

Native entry resolves the actual request, packaged asset root/revision and initiating ID/cwd, then invokes existing taxonomy/playbook/context composition. Codex performs explicit bootstrap instead of relying on Claude interpolation. Minimum entry belongs in Phase 2; full interactive/persona/native-hook binding belongs in Phase 4.

The early pilot runs one exclusive checkout in a separate clone with its own Git common directory, outside the original clone's linked-worktree/prune domain. Verify that boundary with existing Git primitives and a legacy-reader fixture. Do not build a clone/profile manager. A marker or explicitly assigned sibling worktree cannot protect against older Claude cleanup.

The initiating session may use native recon descendants whose source-qualified parent chain is observed in the same snapshot. Independent roots and unverified ancestry still compete; canonicalize competitor cwd before containment. This reuses runtime identity values, not another ownership system.

The pilot names its spec, phase and cwd explicitly. Allowed work is local context, implementation/spec edits, validation, progress/ledger/in-flight updates and local commits. It uses existing recall and per-file/doctor checks explicitly until trusted native hooks are active.

Shared capability handling must refuse unready claims/takeover/remote mirroring, automatic board-based target allocation, placement/prune, push/publication, next-session launch and crew before dispatch. Canonical execute/handoff instructions must recognize that declared restricted result instead of retrying through Claude defaults or reporting successful skipped actions. The pilot finishes a local handoff, not full managed handoff parity. No restriction changes Claude's default workflow.

A real code chunk from this spec, its local handoff and fresh-session pickup provide early adoption evidence. Test the candidate actually executed, not a catalog version. Full normal shared-repository workflow follows in 2b/4.

## Shared daily workflow

Phase 2b wires the existing normalized observations into claims, board/list, placement and prune. References compare execution source plus native ID. Healthy claims can be evaluated independently of a failed unrelated source; tree-wide placement/cleanup requires coverage of all participating sources.

Before qualified shared writes, prove compatible managed entry/resume/maintenance cutover. Old 2.51.0 readers cannot see Codex safely; a new marker alone does not constrain them. Unknown/older participating writers require restart/refusal. Rollback below the writer floor requires no incompatible live state or an explicitly reviewed migration.

Phase 4 restores full managed execute/handoff, the rest of the interactive modes, canonical review/recon agents, project overrides and native recall/validation hooks. Existing approval, publish, ship, fresh-session and stop rules remain shared. See workflow-parity.md for every mode/tool owner.

## Normal launch

Phase 3 reuses pure launch planning and existing terminals. A capability check precedes placement/brief writes. Native request/skill syntax and cwd are explicit; configured model/permissions remain native. A terminal acknowledgement does not fabricate a session/worker handle.

Approved later DX belongs to Phase 3: a thin `spec` command using existing entry/launch composition, default to the initiating host, and discover the needed source/candidate automatically without manual shell setup. No new framework; the restricted pilot's explicit bootstrap remains in force until this feature is accepted.

Next-session suggestions/replies, prep spin-offs and interactive babysitter launches retain existing selection and busy-tree rules. Do not launch from stale branch-only phase regrouping.

## Managed launch and crew

Phase 3b adds dedicated background creation with proved owned handles. Atomically reserve stable run/target/slot before external launch; persist source, exact turn/generation and release. Unknown launch outcomes hold capacity until reconciled, including after controller restart. Simultaneous ticks cannot duplicate targets or exceed caps.

Roster/wait/attention/evidence/control route by the persisted handle. Completion is the owned turn plus existing close-out checks. Disconnect, missing rows and later user continuation do not prove completion. Lost stop/archive acknowledgements retain records/capacity; newer unowned activity prevents automatic control.

Native disconnect survival and yielded child cleanup must be demonstrated. If the transport cannot satisfy a required feature, report the concrete gap rather than silently falling back to Claude or an improvised detached runner.

## Validation and release

Feature-owned contracts and real native acceptance ship with each increment. Claude regressions run at every PR. Phase 6 consolidates suites/CI and closes every parity row; it does not delay basic installation/workflow verification.

Keep native hook trust and actual invocation required for automatic validation. Keep remote ownership and worker safety acceptance with the features that use them. Native update behavior uses existing release tooling and fresh-session recovery; no compatibility claim rests on a skipped probe.

## Decisions and alternatives

| Decision | Chosen | Rejected alternative | Reason |
|---|---|---|---|
| Final scope | Complete daily workflow on both hosts | Treat a pilot/four-command demo as finished parity | Anton requires every existing feature |
| Delivery order | Local use → shared interactive work → launch → workers | Bootstrap behind worker recovery | Adoption can help finish the port |
| First-use boundary | Exclusive separate-clone pilot until shared coordination works | Assigned sibling tree or marker-only safety | Old readers can neither observe Codex nor obey new markers |
| Policy ownership | Canonical modes with one capability contract | Host-specific workflow copy | Avoid divergent success/approval behavior |
| Runtime variation | Existing small ports/concrete adapters | Universal provider framework or scattered host branches | Two actual runtimes need a bounded integration |
| Identity and reads | Existing qualified refs and per-source coverage | Naked IDs, unknown-as-empty, native history-as-liveness | Protect correct ownership and healthy observations |
| Coordination | Existing atomic state at mutation/worker boundaries | New database/daemon or stale planning authorization | Reuse proven mechanisms |
| Hooks/reviewers | Native translation plus canonical logic/personas | Personal bridge, drifting copies or presumed auto-registration | Source-contained parity with real feedback |
| Updates | Native install/update and fresh-session recovery | Updater, retention or second activation authority | Already resolved scope; focus on the workflow |
