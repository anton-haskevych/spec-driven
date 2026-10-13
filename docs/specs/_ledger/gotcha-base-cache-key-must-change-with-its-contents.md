---
kind: gotcha
paths: [skills/spec/tools/mainline/base-cache.ts]
created: 2026-10-12T23:21:02-07:00
seen-in: [self-driving-loop]
---

# Changing what the base cache extracts needs a `BASE_LAYOUT` bump

The board's base cache (`<common-dir>/spec-board/base/<sha>.<layout>`) is reused whenever the folder exists and is non-empty. Change `READ_SET` or what `extractReadSet` writes and bump `BASE_LAYOUT`, or every checkout keeps answering from caches made by the old code until main moves.

Seen on self-driving-loop phase 1: adding `reviews/` markers without a new key would have turned every spec with phases into a review row on the sha already cached. The same reuse trusted an empty `<sha>` folder and made `claim take` refuse "no spec named self-driving-loop" (2026-10-12); an empty folder is now a miss.
