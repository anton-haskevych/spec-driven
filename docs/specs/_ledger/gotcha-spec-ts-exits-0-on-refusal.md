---
kind: gotcha
paths: [skills/spec/tools/spec.ts, skills/spec/*.md]
created: 2026-10-12T20:45:12-07:00
seen-in: [oversee-crew-spec]
---

# `spec.ts` exits 0 even when it refuses: never chain on `&&`

Every `spec.ts` command prints its result as the last stdout line and exits 0, refusals included
(`phase tick: "1.1" matches 5 open items …`). `bun spec.ts phase tick … && git commit … && spec.ts push`
committed and pushed after a refused tick. Run a command whose answer decides the next step on its own
and read the line; chain only steps that don't depend on it.

Why: hooks and injected commands must fail open (ROADMAP → *Rules for every release*), so the CLI
never signals with exit codes. Seen in oversee-crew-spec phase 1 execute (2026-10-12).
