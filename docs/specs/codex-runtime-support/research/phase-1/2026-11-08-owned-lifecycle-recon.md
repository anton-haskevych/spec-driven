# Owned lifecycle recon — session 2

One scoped explore-waves wave: `lifecycle_seam` and `native_lifecycle_research`; parent synthesis. Phase 1 only. Native writes follow preflight and a durable probe ownership record.

## Seam and reuse

- `skills/spec/tools/runtime/codex/transport.ts:16,35–37` allows only loaded-list/read. Its frame handler (`:79–86`) ignores notifications and server requests. Preserve that public refusal contract; extract shared bounded RPC mechanics before adding an opt-in probe connection.
- `transport.ts:19–64,67–105` already supplies Bun 1.4.4 Unix HTTP Upgrade, initialization, timeout, response correlation and termination. Reuse it rather than another WebSocket implementation.
- `tests/runtime-codex-transport.test.ts:10–30` provides a disposable Unix endpoint. Tests must prove the read-only facade still refuses every write, and that probe-only events retain native request IDs without confusing server requests with responses.
- `runtime/capabilities.ts:12–17` keeps managed use unverified. No production claim, board, launch, crew or installation composition changes belong here.
- `technical.md:112,130–134` requires owned thread and turn, fresh generation checks, acknowledgement plus descendant termination, and retained unknown outcomes. A matching global row is not ownership.

## Native research

Local CLI/app-server 0.167.0 schemas generated at `/tmp/codex-runtime-phase1-session2/schema`. `ThreadStartParams` supports explicit cwd; `TurnStartParams` returns an owned turn through `TurnStartResponse`; `ThreadResumeParams` rejoins by ID. Do not override configured model or permissions. `ThreadShellCommandParams` is an unsandboxed auxiliary path and is not representative model-tool cleanup evidence; do not use it.

Official [app-server documentation](https://learn.chatgpt.com/docs/app-server) describes initialize/initialized, server requests, resume and interruption. An interrupt response acknowledges the request; independently read the exact turn's terminal status and observe controlled processes. Schema presence is not operational proof.

## Testing-issue estimate

- Missing: native event/request observer, probe ownership journal, controlled foreground parent/child/grandchild, actual attention evidence and sanitized lifecycle observations.
- Existing transport is 106 lines; no size-driven split is needed, but shared socket mechanics have two concrete consumers and need extraction with tests. Keep each new file under 250 lines and functions under 50.
- Real attention depends on tools/configuration. An unavailable tool is an incomplete probe, not a fabricated approval or proof of platform failure. Do not weaken permission settings to manufacture attention.
- Ordinary tests stay independent of the user's daemon/home. Live worker writes are explicit agent-run probes with a launch key before creation, returned thread/turn immediately journaled, bounded observation and cleanup. A timeout never causes blind recreation.

## Synthesis

One wave locks the seam. Native schema/tool limitations are the remaining uncertainty; resolve them with the controlled run, not speculative production worker machinery.
