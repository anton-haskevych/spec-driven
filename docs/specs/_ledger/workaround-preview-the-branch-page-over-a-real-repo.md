---
kind: workaround
paths: [skills/spec/tools/page/**, skills/spec/tools/tests/page-preview.ts]
seen-in: [live-board]
created: 2026-11-13T15:46:17-08:00
---

# To check the branch's page on a real board, run page-preview with --repo; emulate phones

`bun skills/spec/tools/tests/page-preview.ts <port> --repo <dir>` serves this checkout's page over that
repo's board, read-only, beside the repo's own `spec.ts page` server. In headless chrome-devtools, size a
phone with `emulate` (`viewport: "390x844x2,mobile,touch"`), not `resize_page`.

`spec.ts page` from the repo runs the cached release and `servePage` writes the clone's page state file,
so starting the branch's server that way would replace or confuse the one people have open. Headless
Chrome won't shrink a window below 500 px: `resize_page 390` leaves a 500 px layout that looks fine and
proves nothing about phones (phase 10aa, 2026-11-13).
