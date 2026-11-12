---
kind: workaround
paths: [skills/spec/tools/tests/**, skills/spec/tools/record/ref.ts]
seen-in: [live-board]
created: 2026-11-12T01:44:15-08:00
---

# To test a remote that hangs, point origin at `http://10.255.255.1/…`, not at a missing path

A missing path (`<root>/nowhere.git`) fails at once, so it only tests the fast offline case. `git remote set-url origin http://10.255.255.1/nowhere.git` makes a fetch hang until the runner's `timeoutMs` kills it (measured: killed at 3004 ms with a 3 s limit, 2026-11-12), which is how an unreachable host behaves on a bad connection. Use it when a test asserts a time budget offline.

It also showed why a fetch that timed out must not be followed by another network call: `fetchRecordTip` used to run `ls-remote` after any failed fetch, doubling the wait (`record/ref.ts`, fixed by `ranOutOfTime` in `core/run.ts`).
