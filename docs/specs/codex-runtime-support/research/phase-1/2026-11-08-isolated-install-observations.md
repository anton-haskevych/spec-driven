# Isolated native installation observations

Phase 1, third session-2 chunk. CLI/app-server 0.167.0. Actual native local metadata/install operations, not a mocked installer. No live installation, auth, personal hook, bridge, project config or authored version changed. No push, publication or release. Stop at this proof failure and handoff boundary; no update coordinator selected.

## Isolated setup and reproduction

Owned root `/var/folders/4m/6k_8m_6d6fl_3crcj4zl19pr0000gn/T/codex-phase1-install-gfuuxyva`; only native children received CODEX_HOME=`<root>/home`, cwd=`<root>/workspace`. No HOME override, copied auth or sign-in. A complete `git archive 22e7ec7b6aae89c4a13c299e1dff024a26a1d1bc` was extracted into `<root>/market/plugin`. A wrapper `.agents/plugins/marketplace.json` declared marketplace `phase1-native-proof`, plugin `spec-driven`, relative local source `./plugin`, AVAILABLE installation and ON_USE authentication.

The wrapper was committed to a disposable Git repo and cloned bare into `<root>/serve/market.git`. Python's standard HTTP server bound only 127.0.0.1 on ephemeral port 59827. `git update-server-info` supported ordinary Git HTTP reads. Native marketplace listing independently identified this source as `sourceType:git`, not a local-directory marketplace. No remote public repository was modified.

All native CLI commands below received the scratch CODEX_HOME and scratch cwd:

1. `codex plugin marketplace add http://127.0.0.1:59827/market.git --json`
2. `codex plugin add spec-driven@phase1-native-proof --json`
3. Start a standalone `codex app-server --listen unix:///tmp/codex-phase1-install-gfuuxyva.sock` with the same scratch home; never invoke daemon start/restart. Use shared bounded `connectProbeRpc` against **that socket**, not default-source discovery.
4. Observe `plugin/installed`, force-reloaded `skills/list`, and `hooks/list`; start exactly one owned old native thread and retain its client connection. No model turn is necessary for these metadata observations.
5. In the disposable source only, use its existing version helper to set `2.51.0-phase1.1`, add `.codex-plugin/plugin.json hooks: ./codex-hooks/hooks.json`, and bundle a harmless SessionStart hook. Its command is `bun "${PLUGIN_ROOT}/codex-hooks/start.ts"`; if actually trusted, it would append only a fixture marker under native PLUGIN_DATA. No trust acceptance was performed.
6. Commit the fixture candidate, fetch it into the owned bare repo, update server info; run **scoped** `codex plugin marketplace upgrade phase1-native-proof --json`, then **selected** `codex plugin add spec-driven@phase1-native-proof --json`. Never run blanket upgrade/sync.
7. Observe installed/catalog/current-thread/new-thread hook metadata and independently inspect both cache paths. Stop rather than making another release candidate after retention fails.

## Observations

- Auth-free local metadata/install operations succeeded. Initial native install path ended `plugins/cache/phase1-native-proof/spec-driven/2.51.0`. Before refresh, five actual cached files matched their historical Git objects byte-for-byte: native manifest, spec skill, claims/store, claims/rules and trees/prune. This is a complete real historical package install, with targeted content verification, not a complete runtime feature proof.
- Scoped Git upgrade returned only `phase1-native-proof`, one upgraded root, and errors:[]; selected-plugin add returned version `2.51.0-phase1.1` and a distinct candidate cache path. The actual native fresh disk catalog moved all 16 skills to that path. `PluginSummary.localVersion` reported the candidate; advertised backend version was null. This does not attest an existing model turn's loaded release.
- Native old thread `01a1be6f-c592-7101-aa1a-cbb8fcf0755e` was kept on the original persistent client. Before and after upgrade, `hooks/list(threadId)` returned its original empty hook list. Fresh candidate thread `01a1be70-ca46-7b90-8eaf-407beea65960` loaded the candidate's plugin hook metadata, with enabled:true, isManaged:false, source:plugin, trustStatus:untrusted. Directory hook metadata also included the bundled script digest; loaded-thread currentHash did not have the same composite representation. Do not conflate those hashes or infer trusted execution.
- **The 2.51.0 cache directory was removed by native selected-plugin installation.** Candidate cache remained. Therefore a started native thread plus a versioned cache path does not establish the spec's immutable retention guarantee. No active model turn was started in this scratch home, so actual in-use model/tool behavior after eviction remains unverified. This bounded negative proof is sufficient to block relying on automatic native retention; it is not a claim of a live user incident.
- Both owned empty native threads were archived successfully. Exact owned HTTP/server PIDs 26553 and 26719 were identified by unique launch arguments and stopped; their exec sessions completed. No native thread was deleted. No hook marker or trusted invocation was established.

## Experiment errors and evidence limits

The persistent metadata driver held its own in-memory journal. A parent tried appending hash observations to that same journal, and a later driver write overwrote that added field. The byte-comparison command and its successful five-file verification are retained in this session's tool evidence; immutable fixture hashes were recomputed from the same historical Git objects. Subsequent filesystem inspection exposed the now-missing old cache. Do not claim the overwritten field itself survived. Shared production coordination must not copy this throwaway multi-writer journal approach.

One attempt to prepare a second candidate failed on that missing journal field, then a second attempt failed on the missing old-cache file. Neither reached the source mutation. Their following scoped upgrade calls returned no upgraded roots and errors:[]; one selected-plugin re-add reported the same phase1.1 candidate. No phase1.2 candidate was created. These experiment errors do not invalidate the first successful source verification or observed eviction.

A separate connection's `thread/read(includeTurns:true)` returned -32601 for the empty historical thread before its first turn; it was not positive loaded-version attestation. The original connection's successful loaded-thread hook observations and archive acknowledgements are the actual thread evidence. Standalone server logs also reported Responses WebSocket connection failures; no authenticated model execution is claimed. No auth was supplied to work around them.

Native CLI/desktop resume, selected-release enforcement on resumed model execution, positive hook trust, changed-script re-review, per-thread loaded plugin attestation and safe rollback remain **unverified**. No desktop app was launched because its isolation from the live desktop profile was not established. Untrusted metadata plus an absent marker is not proof that a SessionStart event was attempted and correctly skipped.

## Disposition

Do not tick either remaining Phase 1 deliverable. Native cache eviction invalidates treating scoped native reinstall as safe beside old sessions without a separately proved retention strategy. Recommend staging freshness information while any managed spec session uses the selected release, and performing native activation only after a verified quiescent cutover; preserve native authority and never patch cache retention. This changes the desired alongside-active-session update behavior and needs a recorded design answer before implementation continues.

The existing plugin-publish scoped flow is useful prior art and was exercised in isolation. Its version list verification alone cannot attest old loaded sessions or keep their files. No custom coordinator/activation pointer/helper was introduced. [Official native package/cache rules](https://developers.openai.com/plugins/build/plugins) and [hook review/trust](https://learn.chatgpt.com/docs/hooks) distinguish installation, catalog, execution and trust; observations above are local/version-specific.
