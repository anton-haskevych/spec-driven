---
kind: decision
applies-to: [phase 10a, 11]
created: 2026-11-13T14:48:36-08:00
---

# Card load as built (phase 10a)

`card load --file <docs.json> [--move-taken]` (`commands/card/load.ts`, pure parts in `cards/load-file.ts`
and `cards/load.ts`). What phase 11's one-off script must emit:

- `{ "cards": { "c01": <card doc> }, "sources": { "c01/a": <source doc> }, "tags": { "<name>": <tag doc> } }`,
  each document in record shape (`CardDoc`, `SourceDoc`, `TagDoc`). A doc may leave out `id` / `card` /
  `name`; the key fills it. Ids compare by number (`c01` = `c1`) and are written as `c1`.
- Source letters are the file's (`a`, `b`, … `aa`); each card needs exactly one `role: origin` source.
  A card's `assignee` is not checked against `board.people` (only `card add` checks it): map it right.
- Checks run inside the plan at each tip: every doc reads (`validateRecordDoc`), then `cardProblems` on the
  board as it will read, limited to the paths the load writes. The first 10 problems are printed.
- A file source at a path already on the board refuses (a quote is never replaced); a file tag replaces
  an existing tag of the same name.
- `--move-taken`: taken cards, in number order, go to max(file, board) + 1 onward, keeping fields, covers and
  source letters (the old paths are replaced by the file's docs or deleted).
- One commit: `LOAD_MAX_OPS` = 2000 raises `planWrites`' 50-op cap for this write only (`WriteOptions.maxOps`).
  Blobs are written with one `hash-object --stdin-paths` call, not a spawn per document.
- add, import and load share `landNow` (`commands/card/land.ts`): never queued, lines reset per tip.
