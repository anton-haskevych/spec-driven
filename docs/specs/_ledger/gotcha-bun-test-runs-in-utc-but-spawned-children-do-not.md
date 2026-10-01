---
kind: gotcha
paths: [skills/spec/tools/tests/**]
seen-in: [spec-loop-automation]
created: 2026-09-30T15:56:58-07:00
---

# bun test runs in UTC, but processes it spawns use the machine's zone

Inside `bun test`, `Date` is pinned to UTC while `process.env.TZ` stays unset, so a spawned `bash`/`date` falls back to the system zone. When a test compares in-process time against a child process, pass the zone explicitly: `env: { ...process.env, TZ: Intl.DateTimeFormat().resolvedOptions().timeZone }`.

Seen when `isoTimestamp` was compared with `spec-bump.sh --now`. The test passed when its file ran alone under an explicit `TZ=…`, and failed in the full run with `+00:00` vs `-07:00`.
