# Old-session resource execution recon

Scope: the two remaining Phase 1 proof obligations, starting with actual historical script execution across an isolated selected-plugin update. One parallel read-only wave was sufficient: execution/ownership and installation/distribution seams. No runtime capability was enabled.

## Seam and reuse

- `skills/spec/tools/runtime/codex/probe-rpc.ts:18` accepts an explicit isolated Unix socket, bounded requests, experimental opt-in and event observation. Reuse it unchanged; `runtime/codex/transport.ts:7` remains read-only.
- `skills/spec/SKILL.md:23-30` requires deferred plugin-local taxonomy and `tools/spec.ts` reads. `scripts/version.py:47-52` is an existing read-only executable dependency that independently reports the installed package's three version declarations. Both belong to the actual historical package, not an invented marker script.
- `skills/spec/tools/tests/runtime-codex-install.test.ts:16-32` and `fixtures/codex-install/observed.json` preserve the earlier zero-model-turn/cache observation. Add distinct evidence instead of rewriting it.
- `/tmp/codex-runtime-phase1-session2/install-driver.ts:9-27` establishes explicit-socket install/catalog/hook reads. Its single journal suffered competing writes; do not reuse its mutable file or already-upgraded home.
- `/tmp/codex-runtime-phase1-session2/driver.ts:39-44,78-88` provides exact thread/cwd/newest-turn ownership and quiescence checks. Record creation intent before requesting a thread; persist the returned ID before further writes. Archive only owned, idle threads with no native terminals.
- `/Users/antonhaskevych/.codex/skills/plugin-publish/SKILL.md:90-99` provides scoped marketplace upgrade, selected install and native version verification. Exercise only a new disposable Git marketplace; no publication, broad sync or live cache mutation.

## Native capability distinction

Installed 0.167.0 schema `ThreadShellCommandParams.ts:5-18` and [official app-server documentation](https://learn.chatgpt.com/docs/app-server#run-a-thread-shell-command) expose bounded per-thread shell execution. Completion arrives through turn/item events, not its immediate empty acknowledgement. This route runs with full access, so the experiment permits only explicit finite commands against owned scratch paths: historical version check, historical spec settings, and resource reads. It does not prove model-selected tools or inheritance of sandbox policy.

The same schema's `GetAccountResponse.ts:7` allows account presence/required-auth inspection without reading credentials. A fresh isolated home must establish authentication before an active-model proof is claimed. Do not copy credentials, override model/permission settings, use a fake provider or substitute a failed model request for active execution.

## Testing-issue estimate

- Existing relevant files are below 250 lines: shared RPC 108; install tests 33. No extract-first split is needed.
- Missing native evidence: authenticated old-model execution, positive trust/re-review, CLI/desktop resumed-entry fencing and rollback. Offline fixtures cannot manufacture these capabilities.
- New observation tests must separate successful pre-update execution, post-update pinned-path execution, fresh candidate execution, actual thread continuity and active-model attestation. Preserve exact exit/output events, hashes, native versions and cleanup.
- `connectProbeRpc` cannot answer server-originated approval/auth/input requests. Do not widen the production facade for this proof.
- Desktop isolation remains unestablished. Do not launch or modify the live desktop profile.

## Next experiment

New disposable CODEX_HOME/workspace and loopback Git marketplace; install the full historical package, verify hashes, retain the old native thread, execute actual historical scripts, install a version-only fixture candidate through the scoped native flow, then execute the same old paths and the candidate paths. Read account metadata without token refresh. Treat direct-shell evidence and any missing model authentication as separate observations. Preserve the approved coexistence requirement regardless of the result.
