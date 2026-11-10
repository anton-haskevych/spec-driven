# Phase 1 contracts and capability recon

Read-only wave: `runtime_seam` and `probe_recon`; parent synthesis. Scope is Phase 1 only. No native writes, installs or shared claim edits.

## Seam and reuse

- `skills/spec/tools/sessions/live.ts:9–28` owns Claude input values. Preserve PID/start verification (`:65–78`), parked idle (`:53`) and conservative unknown-state mapping (`:117`). Extract/re-export only shared status/name value types. Add a separate normalized adapter; do not replace existing consumers in Phase 1.
- `sessions/own.ts:3`, `launch/command-line.ts:19–31`, `launch/background.ts:13–19` preserve existing identity and exact normal/background CLI behavior. Tests already pin argv, cwd, brief notes and stdout (`tests/launch-background.test.ts:45–97`, `tests/launch.test.ts:40–46`). Add explicit Codex-env rejection characterization.
- `core/run.ts:1–25` and `core/result.ts:1` are the plain command/result boundary. Reuse injected Runner/AsyncRunner and typed factories (`tests/factories.ts:77`, `tests/stub-runner.ts:7–37`). No new subprocess framework.
- `sessions/agents.ts:28–36` and `tests/fixtures/claude-agents.json` cover roster CLI output. `hooks/lesson-recall.ts:18–35` and `hooks/spec-file-check.ts:82–94` define distinct Claude output envelopes. Characterize exact envelopes without invoking global hooks.
- `claims/rules.ts:36–41` compares bare IDs; `claims/store.ts:105–112` discards extra runtime fields. `trees/prune.ts:47–50,76–88` reads only Claude sessions; `trees/prune-rules.ts:28–35` can nominate a clean merged tree without Codex evidence. Historical fixtures must preserve the actual 2.51.0 reader, not reimplement it.

## Native proof seam

- Installed Bun 1.4.4; Codex CLI and daemon 0.167.0. `codex app-server daemon version` reports the configured Unix control socket. Only this source is observed; alternate homes/daemons, no-daemon and remote hosts remain unsupported until separately proved.
- Official app-server protocol documents Unix HTTP Upgrade and paginated loaded/read calls. Bun's maintained built-in Unix WebSocket support is a candidate; researcher checks official release notes and installed behavior before selection. Proxy JSONL failure does not imply direct stdio app-server failure.
- Keep request transport injectable, read-only allowlisted, bounded and separately tested. Do not record unrelated thread text, credentials, raw config or native database contents. A successful current-source probe is not complete machine coverage or worker lifecycle evidence.
- Native activation/retention/trust and old-session resume fencing remain unproved. No live installation changes are authorized. Read the existing scoped plugin-publish flow before any distribution proposal.

## Testing-issue estimate

- No native transport/lifecycle harness exists. New contract tests must inject response pages and cover malformed/error/timeout/pagination/identity-missing cases. Live probes must be opt-in and outside ordinary `bun test`.
- No size-driven extraction is required: live 129 lines, run 93, recall 66, checker 106. `tests/launch.test.ts` is 217 lines; keep new characterization in separate files.
- File/PID I/O already has injected seams. Preserve those; map plain values separately. Do not force native asynchronous reads into synchronous consumers or wire new policy in Phase 1.
- A single launch surviving its launcher disconnect is useful observation, not proof of approvals, restart recovery, process cleanup or complete coverage.
