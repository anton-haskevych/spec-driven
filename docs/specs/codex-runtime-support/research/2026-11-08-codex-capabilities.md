# Codex capability evidence — 2026-11-08

Research was read-only, using installed CLI/app-server 0.167.0 and current official documentation. No native thread or turn was created, interrupted or archived. No configuration/credential changes occurred.

## Verified

- Remote spec-driven HEAD/main and source/installed manifests resolve to version 2.51.0 at 22e7ec7b6aae89c4a13c299e1dff024a26a1d1bc.
- Codex normal CLI supports `codex -C <cwd> <prompt>`; Claude's -n/--bg syntax has no direct CLI equivalent.
- Current execution exports CODEX_THREAD_ID and CODEX_SESSION_ID. The plugin currently consumes neither; interchangeability of these values is not established.
- Installed protocol schemas expose thread/start, thread/name/set, turn/start, thread/read, thread/loaded/list, thread/turns/list, thread/items/list, turn/interrupt and thread/archive.
- Read-only direct Unix WebSocket connection to the configured local control socket succeeded with the installed established websockets 16.0 library and the protocol initialize handshake. It returned three loaded sessions; sampled statuses were active and newest turn inProgress. No unrelated conversation text is preserved here.
- Standard JSONL through `codex app-server proxy` produced no initialize response within 25 seconds; only the probe's proxy child was terminated. It is not a proven transport.
- thread/loaded/list accepts cursor/limit and returns data IDs/nextCursor. thread/read contains status (active with flags, idle, systemError, notLoaded). Native attention flags include waitingOnApproval and waitingOnUserInput.
- thread/turns/list supports descending pagination and itemsView; newest status can be inProgress/completed/interrupted/failed. thread/items/list returns wrapper entries `{turnId,item,startedAtMs,completedAtMs}`, not raw items; agentMessage text is item.text.
- Current CLI supports scoped native marketplace upgrade and plugin add/install; app-server schemas also expose marketplace/upgrade, plugin/install and plugin/reconcile. A cache directory is the installed load source even for local marketplaces.
- Native plugin hooks resolve PLUGIN_ROOT and compatibility CLAUDE_PLUGIN_ROOT. Updated bundled scripts can require new native trust review.
- Codex native skill invocation differs from a Claude slash literal. Explicit skill input is available in the app-server protocol. Native custom-role docs describe TOML definitions in supported global/project directories; bundled Claude Markdown agent files do not establish registration.
- No documented local Codex per-marketplace autoUpdate interval was found; native daemon update management is a separate concern.

## Unproven; must gate implementation

1. Direct Unix WebSocket support from the plugin's chosen Bun/library and configured daemon discovery/auth across supported platforms/homes.
2. Newly started worker persistence after client disconnect, controller restart and native daemon reconnection.
3. Interrupt acknowledgement, pending approval/user-input handling, shell/process-tree cleanup and safe archive.
4. Complete local session coverage across CLI/desktop, separate daemons, no-daemon mode, alternate homes and remote execution.
5. Native skill bootstrap/scoped-hook invocation and all reviewer personas on a clean plugin install.
6. Safe install retention/activation while sessions are active, rollback and hook trust after release updates.

## Official references

- [App-server protocol](https://learn.chatgpt.com/docs/app-server)
- [Plugin packaging and cache behavior](https://developers.openai.com/plugins/build/plugins)
- [Skills](https://learn.chatgpt.com/docs/build-skills)
- [Hooks and trust](https://learn.chatgpt.com/docs/hooks)
- [Custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)

Method discovery is not operational proof. These bounded facts support a design and targeted spikes, not a claim of working background crews or automatic updates.
