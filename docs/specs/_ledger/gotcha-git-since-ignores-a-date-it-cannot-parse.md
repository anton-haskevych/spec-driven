---
kind: gotcha
paths: [skills/spec/tools/crew/**, skills/spec/tools/tests/crew-*.test.ts]
created: 2026-10-13T01:09:20-07:00
seen-in: [oversee-crew-spec]
---

# `git log --since` silently ignores a date it can't parse: pass ISO dates it reads

`git log --since=2999-01-01T00:00:00Z` filters nothing: git's approxidate doesn't read that year and
the filter falls away, so every commit matches. A "newer than the launch" check then passes on an old
commit. Pass `isoTimestamp()` values (or `Date#toISOString()` within a sane range), and in tests use a
date near now, such as an hour ahead.

Found in oversee-crew-spec phase 4: `crew check`'s handoff-since-launch test passed its fake
far-future launch time and still saw the old `[handoff]` commit. A `bun test … | tail -2` summary hid
the failure (the last two lines are the expect count and `Ran N tests`); read the `pass` / `fail`
lines instead.
