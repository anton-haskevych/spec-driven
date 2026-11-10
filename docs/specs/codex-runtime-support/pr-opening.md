# PR opening and release gates

## Spec state

Full Claude-to-Codex parity remains required. Group A's isolated local cycle has passed on one combined installed candidate; shared writes, full native bindings/hooks and worker activation remain pending. See progress.md and workflow-parity.md for authoritative scope/status. PR A publication as non-draft and squash merge on green were authorized by Anton; release target 2.52.0. Review material is in pr-a-review.md.

| Group | Phases | Enabled value |
|---|---|---|
| A | 1, 2 | Existing foundations plus usable source-packaged isolated local cycle |
| B | 2b, 4 | Shared normal-repository coordination and full interactive workflow/hooks |
| C | 3 | Normal launches, next sessions, spin-offs and interactive babysitter launch |
| D | 3b | Managed workers, unattended babysitting and overseer |
| E | 6 | Complete parity closure and release enforcement |

Groups land in order. Each enables only accepted capabilities; missing later rows remain pending, not failed gates on an earlier delivery. Full-parity claims require the entire inventory. Existing settings require ready PRs and squash merge. Use scripts/version.py from current main at merge, never a guessed version. No direct implementation commits to main. The scoped temporary native test installation/removal was authorized and completed. Anton authorized PR publication and merge on green for 2.52.0. Permanent personal installation/rollout remains separate.
PR #33 merged 2026-11-09 as f55dfbd (squash).

## Pre-PR checks

### Common checks — every delivery

Checked local rows below are evidenced by research/phase-2/2026-11-09-final-combined-acceptance.md and the retained final source-check logs.

- [x] Run canonical Bun tests/typecheck, version agreement and frozen-install checks for the touched package.
- [x] Run Claude regressions for every touched seam, preserving commands, outputs, approvals, defaults, successful behavior and ordinary-session overhead. Record/test intentional improvements.
- [x] Add deterministic contracts and controlled native evidence for each capability enabled by this PR; identify exact executed candidate assets/revision, supported CLI/API/configuration and cleanup.
- [x] Package changed entry/hook/runtime assets in source through existing manifests/version mechanisms; no cache patch, personal bridge or development checkout dependency.
- [x] Doctor/graph/phase references, code-map and scoped ledger are current; new/touched code meets existing structural/import/type rules.
- [x] Unimplemented/unproved capabilities refuse before side effects and are reported as pending. A skipped native test, metadata observation or pure-function test cannot prove native execution.

### Group A — first real local use

- [x] Native candidate entry uses the existing configured identity/context composition; current native ID/cwd and candidate assets/revision are verified.
- [x] One exclusive pilot clone has a distinct Git common directory and lies outside existing managed prune/claim state. Execute the actual historical clone's enumeration fixture; prove no pilot nomination. No marker-only boundary.
- [x] Entry, execute and handoff guard every unavailable automatic action, including remote mirroring, claim/takeover, placement/prune, board allocation, push/publication, next-session launch and crew; no Claude-default fallthrough.
- [x] Complete a real code chunk of this port using the pilot, with explicit recall/validation, invalid-edit feedback/correction, progress/ledger/in-flight updates, local commit and fresh-session pickup. Report it as a restricted local cycle, not managed parity.

### Group B — normal shared daily work

- [ ] Prove supported entry/resume/maintenance old-writer cutover and compatible rollback limits using actual historical-reader fixtures before shared Codex writes. A file floor/marker alone is insufficient.
- [ ] Shared claim/board/list/tree behavior covers qualified/equal IDs, unknown schemas, legacy and remote records, parked sessions, healthy/unavailable sources and source-correct joins.
- [ ] Coordinated managed entry/claim/place/prune revalidates current evidence; competing takes and resume-after-preview-before-removal cannot steal or remove live/unknown work.
- [ ] Run all interactive modes, full managed execute/handoff/publication/cleanup, all seven canonical agents including five review lenses, and project overrides. Runtime-neutral tools preserve existing behavior/authorization.
- [ ] In both hosts, prove handoff-aware recommendations and direct/resume pickup with phase, PR-group and legacy notes, recorded answers, and missing/empty clean-boundary notes. Cover both a required `Pick up from here` instruction beyond the pack clipping limit and one in a note outside the selected phase; verify each reaches the model and informs its first action. Refresh from a destination checkout with newer notes. These are controlled acceptance cases, not instructions to alter live work.
- [ ] Verify canonical review entry after prep/create requests a fresh session before starting any reviewer. In a host/profile where launch is unavailable, report that limit without an inline review; actual selected-host launch/pickup is a Group C check.
- [ ] Native trusted hooks actually invoke pre-edit recall and post-edit validation for multi-file/add/update/delete/move payloads, including malformed input and invalid edits; plain Claude/Codex sessions remain cheap.

### Group C — normal launches

- [ ] Correct runtime/spec/phase/cwd and native request reach a real fresh session through existing terminal selection; preserve Claude command/terminal goldens.
- [ ] Next-session replies, spin-offs and normal babysitter launches preserve owner/busy/existing-tree rules and authoritative PR-group metadata; no duplicate on ambiguous outcome.
- [ ] Retain actual Claude and Codex replies for the full normal interactive loop: finish work, hand off, print up to three numbered handoff-informed choices, wait, accept a numeric/natural-language selection, launch that row once, then read current destination handoffs before work. Prove a selected/direct review after prep/create launches a fresh top-level session with persisted spec context, not the originating conversation. Preserve PR-gate/crew exceptions and honestly report unavailable launches.
- [ ] Native model/permissions retain configured values. Normal acknowledgement never fabricates owned-worker identity. Exercise terminal/UI behavior directly where claimed.

### Group D — full unattended workflow

- [ ] Prove actual native worker disconnect survival/reconnect/controller restart, approval/input attention, bounded paginated owned-turn completion and existing git/handoff/claim close-out.
- [ ] Concurrent controllers, repeated ticks and lost launch responses preserve one target/slot reservation and cap; ambiguous starts hold capacity.
- [ ] Exact-turn interrupt, yielded child-process cleanup and archive are acknowledged; lost/failed control retains ownership/capacity, later unowned continuation prevents control.
- [ ] Exercise full babysit/overseer auto/hold/parking/owner/capacity policy and mixed-runtime/legacy worker records, with Claude regression evidence and guaranteed native cleanup.
- [ ] Verify the overseer uses current handoffs to choose follow-up work, and actual relaunched execute/babysit workers read destination notes and follow recorded answers/pickup instructions before acting; crew completion keeps its existing output instead of offering an interactive launch menu.

### Group E — full parity completion

- [ ] Every workflow-parity.md row passes for both runtimes in the supported configuration; reconcile against the current canonical mode/command inventory.
- [ ] Consolidated harness and CI enforce deterministic contracts/package/version/import boundaries and keep absent native credentials/runtime explicit.
- [ ] Release evidence records exact plugin/assets, CLI/API versions, all scenarios, supported environments and recovery limits. Required missing features cannot be relabelled unsupported to close the port.

### Native rollout — scoped to each enabled delivery

Group A's scoped test exercised the first two rows and restored the prior installation. Later shared-write, old-path recovery and migration gates remain pending for the deliveries that use them. No live cache adaptation was removed.

- [x] Obtain the existing authorization for any personal install/publication changes; record selected source/revision, installed host versions and recoverable source/config state. — scoped Group A test; no native hooks enabled or claimed.
- [x] Use existing release/version and native host install/update operations; verify fresh sessions execute the selected candidate/release and native hook trust when hooks are enabled. — scoped Group A test; no native hooks enabled or claimed.
- [ ] For shared writes, establish compatible managed sessions before activation and exercise supported rollback within the writer floor. Do not require unrelated hosts/features before an isolated pilot.
- [ ] Use fresh-session recovery after native old-path invalidation. No updater/freshness state/retention subsystem.
- [ ] Remove only migration cache adaptations whose source replacement has passed; preserve unrelated setup. Full port completion still requires Group E.
