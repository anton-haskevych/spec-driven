---
kind: gotcha
applies-to: [general]
created: 2026-11-08T19:24:00-08:00
---

# Verify Bun APIs against the installed version, not just current docs

Anton explicitly required Bun 1.4.4 research before further Phase 1 code. Current docs advertised expect.poll/vi.waitFor, but both were absent in the installed 1.4.4; synchronous Jest fake timers were locally verified. Native Unix WebSocket, bearer headers, Bun.serve, Promise.withResolvers, AbortSignal deadlines and terminate were verified locally. See `research/phase-1/2026-11-08-bun-1.4.4-toolchain.md` for sources and exact limitations.

Bun 1.4.4 close() waits for the closing handshake (up to 30s); terminate bounds scratch-client cleanup. A direct child timeout does not prove native remote descendant cleanup. Do not turn either observation into a crew guarantee.

The repo's implicit DOM library shadowed Bun's global WebSocket extensions even though the pinned Bun types declared them. Explicit ESNext library scope suits this Bun-only tools repo and removes the need for casts/global augmentation. Canonical tsc and local bun check both pass. CI is aligned to 1.4.4; no older-runtime parity is assumed.
