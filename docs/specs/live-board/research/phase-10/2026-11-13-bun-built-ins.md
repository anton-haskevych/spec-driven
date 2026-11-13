# Phase 10 — Bun built-ins for the page server (2026-11-13)

Researched with context7 (`/oven-sh/bun/bun-v1.4.2`) and probed locally on Bun 1.4.4. Every row was run.

| Built-in | Use it for | Caveat |
|---|---|---|
| `Bun.serve({ hostname: "127.0.0.1", port })`, `server.port`, `server.url` | The server | A taken port throws `EADDRINUSE` |
| `routes` | Fixed responses, `{ GET, POST }` per path, `:id` as `req.params.id` | An unlisted method gets a bare 404, never a 405 |
| `development` | — | **On by default** unless `NODE_ENV=production`: pass `development: false` |
| Async generator as the `Response` body | Server-sent events (the documented way) | A client cancel fires `req.signal` abort and runs the generator's `finally` |
| `server.timeout(req, 0)` | Keep the event stream open | Default `idleTimeout` is 10 s but the cut is coarse (a quiet stream was reset at ~12 s, a 20 s wait at 24 s): never rely on the number |
| `Bun.escapeHTML` | Escaping in template strings | Escapes `" & ' < >` |
| `Bun.file(path)` as a route value | One static file | Content type is set; no bundler |
| `req.headers.get("host" \| "origin")`, `server.requestIP(req)` | Own-origin check for the one POST | No built-in allow-list or CORS helper |
| `Bun.spawn(cmd, { detached: true, stdio: ["ignore", …] })` + `.unref()` | The detached start | Typed in `bun-types` 1.4.4 though the docs page omits it. The repo already uses `node:child_process` in `trees/prune-background.ts`; keep one way |
| `process.kill(pid, 0)` | Is the pid alive | Throws `ESRCH` when gone; a pid can be reused, so also `fetch` a health route |
| `bun:test` + `fetch(server.url)` | Server tests on port 0 | Read events with `res.body.getReader()`, then abort and `server.stop(true)` |
| `jest.useFakeTimers` / `advanceTimersByTime` | The refresh interval | A `setInterval` inside a handler is faked. **`Bun.sleep` is faked too and hangs**: push from a timer, never sleep in the generator |

**Do not use:** `import page from "./page.html"` in `routes`. It runs the bundler at startup and injects a module
script even with `development: false`. Build the HTML as a string.

**Hand-written (a few lines each):** event framing (`data: …\n\n`), the `Host`/`Origin` allow-list, a body size
and content-type check before `req.json()`, the state file (pid, port, version) with reuse and stale cleanup,
`open <url>` on macOS (no built-in), the set of connected clients.

**Idle cost, measured:** an idle `Bun.serve` process after 30 s: about 13 MB RSS, 0.0% CPU.
