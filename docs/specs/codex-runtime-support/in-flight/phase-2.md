# In-flight state

**Session ended:** 2026-11-09
**Active phase:** 2 — First usable local Codex execute and handoff

## Fixed in assigned source

Continue `~/claude-worktrees/spec-driven/codex-runtime-support-pr-a`, `feat/codex-runtime-support-pr-a`. User asked to fix the default recon rejection and trace its origin. It came from our pilot entry guard introduced by 61a7cb5, not native Codex: every loaded non-self thread in the checkout was treated as a competitor and the decoder discarded native parentage.

Commit `fc1039527e78f3f9bd6221ad9f82c63e9f674adc` fixes the distinction. Top-level native parentThreadId becomes optional source-qualified RuntimeSession.parent. A 20-line pure traversal uses existing equality/keys and the same observed snapshot; only verified descendants of the initiating session are exempt. Independent roots/another root's children/ancestors/siblings, missing/cyclic/foreign ancestry and fork-only metadata still compete. No new RPC scan, ownership system or shared claims activation; Claude producers remain unchanged. Native-entry/capability prose now makes this distinction explicit.

Three new regressions first failed. Final source checks: 1502 tests across 204 files passed, 0 failed (126.03 s); 25 focused tests, typecheck, unchanged frozen install, versions 2.51.0 and whitespace checks passed. Recon/preflight and source/native results are immutable `research/phase-2/2026-11-09-subagent-parentage-*.md`. Native parentage from the original failed recon agents was inspected before coding, not invented.

## Real installed proof of the fix

Read `research/phase-2/2026-11-09-subagent-parentage-native-results.md` for complete source/native boundaries. Exact native candidate was an archive of fc10395 installed by the existing scoped native flow, actual root `~/.codex/plugins/cache/codex-runtime-support-pilot/spec-driven/2.51.0`, revision `sha256:d6b07f242bf8f4f701087be85ac62743d96cb3503f905a64138351db7a062b3b`. Later prose clarifications do not change the tested runtime code; do not infer they were different executed bytes.

Parent `01a1c25f-02d7-7113-a07a-8e392430ba97` ran canonical execute/recon with two simultaneous real read-only children in the existing isolated pilot, no serial override:

- `01a1c260-0b35-7c71-a700-67f66a0c0972`
- `01a1c260-2741-7e12-90bb-dacfcf1bac5a`

Native metadata verified their actual parentThreadId/cwd and loaded status. Installed recall and doctor passed while both children ran, then again after their reports while still loaded. An independent root `01a1c262-3446-77c3-b8d8-6c84a2b9c88c` with parentThreadId null was introduced as the negative control: the parent's one normal installed doctor call refused occupation with exit 1 before dispatch. After only that root was archived, doctor recovered with exit 0 while both children remained loaded. This blocker is fixed and natively verified; the earlier serial workaround is unnecessary for the corrected entry.

Only owned completed acceptance parent/children/root were archived. The native selected plugin/marketplace were removed; all 30 preexisting installed plugins' installed/enabled/localVersion/source metadata matched before/after. Native configured model/home/permissions/trust stayed unchanged. The client exited and its temporary script was removed. Actual logs, receipts, model output, parent metadata, discovery/assets, restoration and SHA-256 index remain at `~/Downloads/codex-runtime-support-subagent-fix/` and `evidence/`.

## Separate retained pilot work and remaining acceptance

The exclusive pilot `~/claude-worktrees/spec-driven/codex-runtime-support-native-pilot` is still clean at `6931a2661c86d664f51a6eca7a7057907cff3ee8`, one checkout, distinct common directory, no remotes. This targeted verification made no pilot code/spec commits. It tested the installed candidate, not the different source still in that clone.

Previous pilot-only `d5e17cd` is the useful cwd/symlink fix/tests; `8f08d36` is the real restricted handoff and `6931a26` its independently confirmed fresh Stage A/B pickup report. Their immutable reports/scoped ledger stay there until separately integrated. Initial candidate revision was `sha256:d6b35e838ac1e361e9640840b65b871fd67293ddcf588b3993b624291c6912ea`; initial canonical recon failed and was worked around serially. Preserve that history honestly; new proof resolves its specific blocker without rewriting old reports.

Next: reconcile/integrate the separately retained useful pilot change/evidence with the assigned source, then assess consolidated installed local-cycle/PR gates for the final candidate. The newly added parentage deliverable is checked; the existing consolidated local-cycle item/top-level Phase 2/PR gates remain open. Do not reopen the resolved subagent blocker or impose serial recon. Keep full reviewers/personas/native hooks/shared-workflow parity required in owning phases; no feature cuts or Claude regression.

No legacy placement/claim/prune, ID alias, credential copy, push, PR, merge, release, updater or profile manager ran. Temporary scoped native install/removal was authorized and is complete. The recorded installed candidate path is now absent by native removal; source packages/evidence are retained for review.
