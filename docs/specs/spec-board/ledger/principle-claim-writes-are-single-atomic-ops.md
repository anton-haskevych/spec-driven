---
kind: principle
applies-to: [phase 5]
created: 2026-10-01T14:01:46-07:00
---

# Every claim write is one atomic filesystem op; the board only reads

**Rules:**
- **Create:** write `<file>.tmp-<sessionId>`, then `linkSync(tmp, file)`. `EEXIST` means it's taken,
  and readers never see an empty file.
- **Take over a stale claim:** `renameSync(file, "<file>.stale-<callerSessionId>")`, then create. Only
  one rename succeeds. The loser gets `ENOENT` and goes back to reading the claim.
- **Unparseable claim:** counts as live.
- **Cleanup** of `done` / `gone` / `.stale-*` files happens only inside `claim take` / `release`, and
  never touches a live claim. The board never writes.
- **Pruning a done/gone claim** is rename, then verify, then unlink. Rename the file to
  `.prune-<callerSessionId>`, then compare its bytes with what was judged. Unlink on a match, otherwise `link` it
  back. A plain read-then-unlink can delete a claim another session just took over (preflight 2026-10-01).

**Why:** a read-decide-write takeover lets two sessions both "take over" the same closed claim, and a
board that deletes claims can delete one that was just re-taken (review C1, C6). The guarantee "two
sessions never take the same phase" only holds if every step is a single atomic op.
