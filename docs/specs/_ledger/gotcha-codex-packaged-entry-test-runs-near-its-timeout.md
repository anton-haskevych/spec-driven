---
kind: gotcha
paths: [skills/spec/tools/tests/codex-packaged-entry.git.test.ts]
created: 2026-11-11T20:10:11-08:00
seen-in: [live-board]
---

# The Codex packaged-entry fixture test runs at its 5 s limit on a loaded machine

`codex-packaged-entry.git.test.ts` → "source fixture completes explicit recall/correction/local handoff …" takes
about 4.8–6.4 s when other sessions load the Mac (load average 17–20 on 10 cores, 2026-11-11), against bun's
default 5 s per-test timeout, so it fails with `this test timed out after 5000ms` while passing alone with
`--timeout 30000`. Before blaming a change, re-run it with `--timeout 30000`; it passed at the branch base and
at HEAD that way. Giving the test an explicit timeout is the fix, in the spec that owns it.
