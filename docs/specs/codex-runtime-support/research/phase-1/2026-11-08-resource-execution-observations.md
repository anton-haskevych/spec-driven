# Native historical resource execution across update

Phase 1, session 3, bounded resource-execution chunk. Actual CLI/app-server 0.167.0 and Bun 1.4.4. Native installs, threads and shell execution occurred only in an owned disposable environment. Production runtime composition/capabilities, live installs, credentials, model/permissions, hooks and authored plugin versions stayed unchanged. No push, publication, PR or release.

## Result

Direct native thread execution of actual historical plugin scripts succeeded before a selected-plugin update and failed at the same pinned paths after it. Candidate scripts succeeded in a fresh native thread. This advances the earlier cache-existence observation to a concrete deferred-resource failure for those paths. It does **not** prove model-loaded plugin identity or active-model behavior across an update.

| Native execution | Before update | After update, same old thread | Fresh candidate thread |
|---|---|---|---|
| Historical `scripts/version.py` / candidate equivalent | exit 0; `All version declarations match: 2.51.0` | exit 2; missing historical file | exit 0; version `2.51.0-phase1.2` |
| Historical `skills/spec/tools/spec.ts settings` / candidate equivalent | exit 0; plugin-default settings | exit 1; `Module not found` at historical path | exit 0; plugin-default settings |

All six native shell turns completed. The two old commands were byte-identical before/after installation. A completed shell turn is not command success: the command items carry the nonzero exit codes above. Native item provenance is `source:userShell`, `pluginId:null`, `scriptPath:null`; the controller selected those paths explicitly. Do not label them model-selected or host-attested plugin execution.

## Isolated environment and provenance

- Root: `/var/folders/4m/6k_8m_6d6fl_3crcj4zl19pr0000gn/T/codex-phase1-execution-lp5dbgsz`.
- Only native child processes received scratch `CODEX_HOME=<root>/home`; cwd was `<root>/workspace`. No HOME override, copied auth or shared live cache.
- Full historical package extracted with `git archive 22e7ec7b6aae89c4a13c299e1dff024a26a1d1bc` into `<root>/market/plugin`.
- Native wrapper marketplace: `phase1-execution-proof`, Git source `http://127.0.0.1:63950/proof.git`. Historical install materialized version `2.51.0` under the scratch home.
- Before update, cached `.codex-plugin/plugin.json`, `skills/spec/SKILL.md`, `scripts/version.py`, `skills/spec/tools/spec.ts` and `skills/spec/taxonomy.md` matched their actual historical Git objects byte-for-byte. SHA-256 values are in the committed fixture.
- Candidate changed only `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` and `.claude-plugin/marketplace.json`, via its own `scripts/version.py --set 2.51.0-phase1.2`. This is a disposable fixture version, not a published/authored release.
- Existing scoped flow: `codex plugin marketplace upgrade phase1-execution-proof --json` returned that one selected marketplace and errors:[]; `codex plugin add spec-driven@phase1-execution-proof --json` selected the candidate. Both exited 0.
- Old native thread: `01a1bea0-85c2-78f0-9a78-9060954dcd15`; four owned shell turns. Fresh thread: `01a1bea2-17d6-71e1-919d-c2f30eb88701`; two owned shell turns. Exact turn/item IDs, commands/output and timestamps are preserved in `tests/fixtures/codex-resource-execution/observed.json`.

## Authentication and loaded-version limits

At `2026-11-09T04:45:53.425Z`, isolated `account/read {refreshToken:false}` returned no account and `requiresOpenaiAuth:true`. No sign-in or credential forwarding was attempted. The exact missing capability for a real model-backed continuation is supported authentication inside the isolated native profile. A live authenticated daemon cannot establish this isolated install guarantee, and copying its auth would violate the proof boundary.

Fresh catalog and selected native installation moved to `2.51.0-phase1.2`; old cache was absent and candidate cache present. The old loaded skill/model release was not attested. Native `thread/shellCommand` can execute without model authentication; [official documentation](https://learn.chatgpt.com/docs/app-server#run-a-thread-shell-command) describes it as a user shell route running outside the thread sandbox. It cannot stand in for a real model-backed loaded-skill proof or permission-policy inheritance.

No positive hook trust/re-review, desktop profile isolation, CLI/desktop old-session fencing or compatible rollback was established. The earlier completed native lifecycle and historical-reader fixtures remain valid and unchanged. Both remaining Phase 1 deliverables stay unchecked.

## Cleanup and experiment errors

- The controller recorded creation intent before native thread creation and persisted IDs before further writes. Later commands checked the exact thread/canonical cwd and that all prior turns were owned and inactive.
- Initial `thread/read` canonicalized `/var/...` to `/private/var/...`; the first strict string comparison refused the next command. The single writer was closed, then resumed only its recorded owned journal/thread after replacing comparison with filesystem canonical identity. No second old thread was created. The replacement connection held the old thread during the update.
- The first Python HTTP helper was named `http.py`, shadowing the standard module; it exited before listening. Renaming it fixed startup.
- The first local bare clone lacked referenced tree objects; native marketplace add failed before installation, and the dependent add found no registered marketplace. A coherent `git clone --bare --no-local` into a new served repository and `git fsck` fixed the scratch source. No native update conclusion comes from those failed setup attempts.
- All six shell commands completed within native 10-second limits; neither thread had remaining native terminals. Archive acknowledgements were successful for both exact owned threads at `2026-11-09T04:48:12.271Z`.
- HTTP PID 57750 and standalone app-server PID 58137 were independently checked by exact unique argv, sent SIGTERM and verified absent. Controller and both exec sessions completed. No thread deletion, unrelated control, detached runner or default-daemon restart occurred.
- Raw single-writer evidence remains in `<root>/execution-journal.json`, with separate `historical-hashes.json`, `upgrade-results.json` and `process-cleanup.json`. Sanitized fixture/controller/source snapshots are committed; ordinary tests never rerun the native operations.

## Concrete retention fork — proposal, not an accepted design

The approved behavior remains old sessions on their loaded release and fresh sessions on the newer installed release. The actual historical workflow defers `tools/spec.ts` and sibling resource reads (`skills/spec/SKILL.md:23-30`); native cache paths alone cannot satisfy that dependency after the observed install.

**Recommended bounded next proof:** investigate an owner-tracked immutable execution bundle for the native-selected release, prepared at explicit spec entry before eviction. Candidate location is the native plugin data directory; [official plugin documentation](https://developers.openai.com/plugins/build/plugins#plugin-bundled-hooks) defines `PLUGIN_DATA`, but does not prove retention, per-session binding or trusted execution from that location. This is a feasibility proposal, not a claim that copying files solves the complete problem.

Acceptance conditions for that proof:

1. Native installation and actual loaded release remain the sole version selector. The bundle is keyed to that exact source/version/content hash and session; no competing active-version pointer, live cache rewrite or blanket wait-for-all rule.
2. All deferred scripts/resources/dependencies are available from the old pinned bundle after native selected install; a fresh authenticated session uses the candidate selected natively. Hashes establish source provenance, not fabricated loaded identity.
3. Old bundled hooks still need a supported trusted entry path: their current commands resolve the old `PLUGIN_ROOT`. A script-only bundle does not fix missing hook entry scripts. Prove native trust/re-review and the hook resource route; do not bypass trust, hand-edit trust/cache state or introduce personal global hooks.
4. Positive authenticated old/new model execution, owned cleanup, native resume/floor enforcement and rollback remain required. If a supported hook or loaded-release binding cannot be obtained, report the host limitation and keep mixed/update activation disabled.

**Alternative:** require a native retention capability/fix before implementing the update guarantee. No such supported mechanism was established on this version. Choosing this leaves the capability unverified; it does not change the product into a universal quiescent-update policy.

This changes the retention mechanism and needs the concrete design choice before implementing it. Nothing in this experiment approves or enables the proposed bundle, a second activation authority, later phases or a live installation.
