# In-flight state

**Session ended:** 2026-11-09
**Active phase:** 2 — First usable local Codex execute and handoff

## Actual result

Read `research/phase-2/2026-11-09-native-acceptance-results.md`. Two real native model sessions completed useful code work, local restricted handoff and independent fresh pickup using the intended installed candidate. Canonical execute first failed when its own recon subagents triggered the blanket occupation guard. The completed cycle required an explicit serial-recon override. This is conditional evidence, not default execute acceptance. Phase 2's local-cycle item, top-level phase and PR gates remain open. Full parity/all Claude behavior remain required; Anton emphasized subagent spawning is critical and questioned a restriction Claude does not need.

## Preserved trees and commits

- Assigned implementation remains `~/claude-worktrees/spec-driven/codex-runtime-support-pr-a`, branch `feat/codex-runtime-support-pr-a`. Inherited source HEAD was `0052610`, preparation commit `4edf117`. Only spec records changed here during acceptance; no pilot code was cherry-picked, pushed or merged.
- Separate pilot remains `~/claude-worktrees/spec-driven/codex-runtime-support-native-pilot`, same branch name in a distinct Git common directory, one checkout, no remotes. Final HEAD `6931a2661c86d664f51a6eca7a7057907cff3ee8`; clean status verified. Original managed worktree enumeration excludes it.
- Pilot `d5e17cdb2017fb4f9032d193aa0ac1b7737d5031` is the useful cwd-containment source fix/tests/recon/preflight. `8f08d367cdcf2e384756f33e59a9a412f28c8178` is session one's local handoff; `6931a26` adds only session-two evidence. Preserve these commits in the pilot until separately integrated.
- Model-written immutable reports and scoped ledger stay in the pilot's existing spec. The controller results report here summarizes them and links actual raw receipts.

## Native proof and restoration

- Actual candidate installed root during both sessions: `~/.codex/plugins/cache/codex-runtime-support-pilot/spec-driven/2.51.0`, revision `sha256:d6b35e838ac1e361e9640840b65b871fd67293ddcf588b3993b624291c6912ea`, frozen archive of `0052610`. Native skill discovery and explicit native skill inputs bound both real model sessions to that installed path. Both returned `Workflow: local-pilot` with actual ID/cwd/source evidence.
- Session one `01a1c001-6425-7cb2-9a00-66afcc6dbaa9`: initial canonical recon failed recall; its two owned children were interrupted/archived. Same-session explicit serial retry completed execute/update/handoff and a clean local commit. 28 focused + 62 entry/Claude regression tests passed; typecheck passed after frozen dependency install. Actual invalid-ledger doctor error, correction/clean rerun and removal were retained.
- First-session unsubscribe acknowledged but left it loaded; actual owned native archive and loaded enumeration established absence before successor start.
- Independent session two `01a1c00c-1e76-79a3-b6c8-db84b449c67f` received minimal candidate/roots/spec/phase/handoff inputs, no conversation fork or summary. It independently verified exact clean `8f08d36`, ended Stage A, then loaded persisted selected Stage B after the separate controller confirmation Anton authorized. No next code chunk ran; evidence-only commit/doctor/clean state passed.
- Both native starts retained configured defaults (`gpt-6.1-sol`, approval never, dangerFullAccess), no overrides. CLI/configured daemon were 0.167.0 in normal home. No trust or credential change.
- After completed sessions, only owned acceptance/recon threads were archived. Native loaded enumeration contained only the outside-pilot controller. Native candidate removal and named marketplace removal succeeded. All 30 preexisting installed plugins' ID/installed/enabled/localVersion/source metadata matched before/after; original spec cache remained. The temporary installed root is now absent by native removal.
- Frozen source package, reviewed actions/briefs, schemas and 78 raw evidence files plus SHA-256 index remain at `~/Downloads/codex-runtime-support-candidate-0052610`. The ephemeral RPC client exited and its temporary script was removed. No launcher/controller framework was introduced.

## Next bounded action

Fix the canonical parent/subagent occupation conflict before calling Phase 2/default execute accepted. Codex already spawned the agents; the blanket loaded-thread check misclassified them as independent competitors. Reuse existing workflow/claim semantics and authoritative native parentage at the adapter boundary. Do not invent a second ownership system or make serial recon permanent. Review owning Phase 2b/4 contracts and current isolation assumptions first, then retry canonical installed acceptance after the fix. Keep every Claude feature and regression requirement. The successful conditional run does not justify treating the initial failed recon as passed.

The useful symlink/unresolved-cwd source fix is in the pilot only and was not installed into the frozen candidate. Its tests are source evidence; the two model sessions are native evidence. Older `0052610` full-suite result remains 1495 tests/203 files; it was not rerun or relabelled by this acceptance. Source records pass file/doctor checks separately from native evidence.

No legacy placement/claim/prune, ID substitution, credential copy, push, PR, merge, release, updater or profile manager occurred. Ownership/publication/cleanup/launches and native hooks/full managed parity remain pending. Scoped temporary installation/removal was explicitly authorized and is complete; do not mistake the historical recorded install root for a currently installed candidate.
