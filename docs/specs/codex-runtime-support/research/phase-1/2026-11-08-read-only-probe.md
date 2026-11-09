# Read-only capability observations

## Reproduction and bounds

Agent-invoked from this assigned worktree: `bun skills/spec/tools/runtime/codex/probe.ts`. Opt-in only; not a default test, startup hook or user-facing command. It invokes the existing AsyncRunner for `codex app-server daemon version` (3s), connects via native Bun Unix WebSocket (3s opening/request deadlines), initializes and allows only loaded-list/thread-read. Enumeration has a 10s between-request budget, 20-page/200-ID caps and cursor-loop detection. All sockets terminate in cleanup. Tests use a disposable Unix server and synthetic fixtures, never native home/session data.

## Observations on 2026-11-08

- Bun 1.4.4 (38afee6c8), CLI/app-server 0.167.0, configured default local Unix daemon: HTTP Upgrade and initialize/initialized passed using Bun built-ins. No transport dependency added. Native bearer header behavior is covered against the disposable server; the configured local endpoint needed no supplied bearer token. Authenticated remote endpoints remain unsupported, not implicitly verified.
- A one-item native loaded-list request returned `nextCursor`; the full probe observed 3 loaded IDs with complete coverage **of that source only**. The current `CODEX_THREAD_ID` was present, thread/read's ID matched, cwd matched this worktree and status was active. No unrelated text or metadata was saved.
- Decoder fixtures cover idle, busy, approval/input/error attention, unknown/unloaded states, malformed pages, timestamp/ID failures, pagination loops, partial reads and disconnect/errors. Healthy rows survive partial discovery, with unavailable coverage.
- Mode refusals for no-daemon, remote/cloud and alternate-home precede CLI/socket work. Missing identity, non-running daemon, missing endpoint and unvalidated versions do not connect. Actual remote/multiple-daemon/alternate-home coverage is not proved; those modes remain unsupported.
- These observations establish no native worker, ownership, hook, installer or release guarantee. Capability reports leave managed ownership/background/mixed writers/automatic updates `unverified` regardless of discovery method availability. Existing production factories do not consume this probe.

## Preflight amendments applied before commit

1. Bun research showed global WebSocket extensions existed but the root tsconfig's implicit DOM library hid their types. This repository contains Bun tools only (`include: skills/**/tools/**/*.ts`). Explicit `lib: [ESNext]` lets the installed Bun types supply the actual constructor and terminate method, avoiding casts or global augmentation. Both `bun check` and canonical `tsc --noEmit` pass across the repository.
2. CI Bun is aligned to the locally verified 1.4.4; no live runtime/install/settings changed. Existing @types/bun 1.4.2 declares every API used once DOM shadowing is removed. Do not infer 1.4.2 runtime compatibility from that fact.
3. Transport client version `1` names the probe protocol implementation, not a claimed loaded plugin release. Loaded plugin identity remains unproved.

## Source/dependency decision

[Official app-server protocol](https://learn.chatgpt.com/docs/app-server) supplies the Unix transport and read-only method/pagination shapes; generated local CLI help confirms 0.167.0's surface. [Bun toolchain research](2026-11-08-bun-1.4.4-toolchain.md) records current release/API research and local probes. Native transport is experimental; these are bounded capability observations, not a general supported Codex production adapter.

## Still required

Controlled owned scratch lifecycle (disconnect/reconnect/attention/descendant interruption); actual old-reader and native resume cutover proof; native install retention/loaded-version/hook trust. Reuse the existing plugin-publish selected-marketplace upgrade → selected-plugin add → native version verification flow. Its broad marketplace sync is outside scope. No update coordinator selected.
