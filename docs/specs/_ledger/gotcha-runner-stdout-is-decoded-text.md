---
kind: gotcha
paths: [skills/spec/tools/core/run.ts, skills/spec/tools/core/git.ts]
created: 2026-10-01T14:02:29-07:00
seen-in: [spec-board]
---

# `Runner` stdout is decoded text: never parse byte-framed or binary output through it

`systemRunner` returns `result.stdout.toString()`. Output whose framing counts bytes, such as
`git cat-file --batch` (`<oid> blob <size>`) or a tar from `git archive`, gets corrupted as soon as a
multi-byte character shows up. Spec docs are full of `—`, `→`, `·` and `✓`. Write to a file instead
(`git archive -o`), or add a bytes-returning runner and slice the `Uint8Array`.

Why it bites: tests built from ASCII fixtures pass, then the first em dash on real data shifts every
later frame. Found in the spec-board pre-build review (`core/run.ts:27`), where two reviewers caught it
independently.
