---
kind: gotcha
paths: [skills/spec/tools/commands/board.ts, skills/spec/tools/board/**]
created: 2026-10-17T21:33:36-07:00
seen-in: [owner-split]
---

# `board <lane> --json` prints the whole model: the lane word only shapes text

`board ready --json` returns every lane, not just READY; the lane positional only picks what the text view prints. A filter that must narrow JSON (`--who`, `--for`) changes `Board` itself, and a test asserting "other lanes untouched" must expect them full, not empty.

Bit phase 3 of owner-split: a test expected `blocked: []` under `board ready --for me --json` and got every blocked row. Prose that wants needs-you rows plus a filtered ready lane can read `board --for me --json` (no lane) and get both.
