# Native recon parentage fix and verification

## Origin and correction

The refusal originated in our connected-entry commit `61a7cb5`: `runtime/codex/entry.ts:60` rejected every loaded non-self thread in the pilot checkout. `runtime/codex/decode.ts` dropped native parentage, so the guard could not distinguish delegated recon from competing root sessions. This was a plugin integration error, not a Codex inability to spawn subagents. The earlier serial override remains historical failed/default-flow evidence, not the solution.

Fix commit `fc1039527e78f3f9bd6221ad9f82c63e9f674adc` retains native top-level parentThreadId as optional source-qualified RuntimeSession.parent. A small pure predicate follows observed same-source parent links to the initiating session, using existing identity keys/equality and cycle termination. Only those verified descendants are exempted from the existing occupation check. Independent roots, another root's children, siblings/ancestors, missing/cyclic/foreign ancestry and copied-history forks without native parentage gain no exemption. Stored claims, identity, coverage, unsupported modes/actions and Claude factories are unchanged. No second ownership system or native RPC scan was introduced.

Native 0.167.0 schema describes parentThreadId as set only for subagents. Read-only native inspection of both original failed children confirmed their real parent ID before implementation. Original source evidence is retained at `~/Downloads/codex-runtime-support-subagent-fix/native-parentage.json`. [Official app-server protocol](https://learn.chatgpt.com/docs/app-server) distinguishes parent relationships and copied-history forks.

## Source checks

Three new decoder/connected-entry regressions first failed against unchanged implementation (13 pass / 3 fail). After the fix, 25 focused tests passed; exhaustive pure ancestry tests cover ordering, direct/nested chains, missing/cyclic parents, other roots/relatives and source/runtime qualification. Connected entry tests pass actual raw child metadata through the existing probe/decoder and require recall to succeed before adding an independent blocking root.

Full suite: **1502 tests across 204 files passed, 0 failed**, 3519 assertions, 126.03 seconds. Typecheck, frozen lockfile install (no changes), version agreement (2.51.0), source file/doctor checks and whitespace checks passed. Red and complete full-suite logs remain in the fix evidence directory. Source code remains below house size caps. The later native-entry/capability prose clarification changes no tested runtime code; the exact frozen native candidate below identifies the bytes actually exercised.

## Real installed candidate

The same scoped native install/verification/removal authorization was used for the requested fix; configured model/home/permissions/trust were preserved. Native selected install returned root `/Users/antonhaskevych/.codex/plugins/cache/codex-runtime-support-pilot/spec-driven/2.51.0`. Force-reloaded native discovery showed the enabled skill; its assets matched independently prepared source `fc10395` at revision `sha256:d6b07f242bf8f4f701087be85ac62743d96cb3503f905a64138351db7a062b3b`. Version alone was not accepted.

The actual native model received that installed skill input and request `execute codex-runtime-support 2`, explicit pilot cwd `/Users/antonhaskevych/claude-worktrees/spec-driven/codex-runtime-support-native-pilot`, original assigned implementation checkout and expected revision. Native start returned configured defaults: gpt-6.1-sol, approval never, dangerFullAccess; no overrides. CLI/configured daemon remained 0.167.0.

Initiating parent: `01a1c25f-02d7-7113-a07a-8e392430ba97`; canonical one-wave/two-agent recon turn `01a1c25f-3833-78d1-a4e3-7a298a74d507`. It used explore-waves with two concurrent real read-only children, with no serial override:

- `01a1c260-0b35-7c71-a700-67f66a0c0972`, `/root/recon_parentage`
- `01a1c260-2741-7e12-90bb-dacfcf1bac5a`, `/root/recon_entry_tests`

Native thread/read metadata independently confirmed both parentThreadId values equal the initiating parent's actual ID, both cwd values equal the pilot and both statuses active during inspection. Native loaded enumeration included both children. The children inspected frozen installed candidate code; pilot source was not silently treated as that candidate or changed.

| Actual model operation | Observed result |
|---|---|
| Installed execute bootstrap | Workflow local-pilot, exit 0, exact candidate/initiating ID/cwd |
| Recall while both recon children were running | Exit 0 |
| Doctor while both were running | Exit 0, clean (1 spec) |
| Recall after reports, children still loaded | Exit 0 |
| Doctor after reports, children still loaded | Exit 0, clean (1 spec) |

All calls used the installed codex.ts with the same actual request/revision/legacy path. Neither child was interrupted, archived or hidden to obtain success. Raw spec.ts, fabricated IDs and thread/shellCommand were not substituted for model execution.

## Independent-session control and recovery

The controller then created a separate root `01a1c262-3446-77c3-b8d8-6c84a2b9c88c` in the same pilot. Its actual no-tools model turn completed with the expected readiness message. Native metadata showed parentThreadId null and idle status; loaded enumeration included it alongside both genuine recon children.

In actual parent turn `01a1c262-77fb-7f10-a0bf-92af5d888db9`, exactly one installed doctor call refused before dispatch: exit 1, `native entry: another native session occupies the exclusive pilot checkout`. The model saved the log/receipt and stopped without retry, identity changes or child cleanup. Thus the exemption did not merely disable occupation checks.

Only the independent completed root was then natively archived; enumeration confirmed its absence while the parent and both children stayed loaded. Parent recovery turn `01a1c263-89f0-72d0-97d0-f7af608b5e8d` repeated the same doctor call successfully: exit 0, clean (1 spec). The real runtime distinguishes delegated children from an independent competing root.

## Cleanup and scope

After all model turns completed, only the three owned verification parent/child threads were archived. The independent control was already archived. Native enumeration no longer contained any of those four IDs. Other outside-pilot source sessions were left alone.

Native selected-plugin removal and named-marketplace removal succeeded. All 30 preexisting installed plugins' installed/enabled/localVersion/source metadata matched before/after; the temporary candidate cache was removed by the native host. No trust, credential, model, permission or home change occurred. The ephemeral API client exited and its temporary script was removed. No managed placement/claim/prune, push, PR, merge, release, profile manager or launcher framework was introduced.

Complete owned native events/requests, model stdout/stderr/receipts, metadata, discovery/assets, loaded enumerations, install/remove/restoration results and SHA-256 index remain at `~/Downloads/codex-runtime-support-subagent-fix/evidence/`. Source logs/candidate source/boot are in its parent directory. Pilot remains clean at `6931a26`; this test added no code/spec commits there. Previous pilot-only cwd fix and two-session reports remain separate records.

**This blocker is fixed and verified natively.** The serial workaround is unnecessary for canonical recon using the corrected entry. This targeted run does not claim complete reviewer/persona binding, native hooks, shared managed ownership/publication/cleanup/launches or full parity. Consolidated local-cycle/release acceptance still follows the owning phase/PR gates; earlier evidence is not silently relabelled as this candidate's full acceptance.
