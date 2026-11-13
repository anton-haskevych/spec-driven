---
kind: decision
applies-to: [phase 10+]
created: 2026-11-13T12:40:00-08:00
---

# Session documents, the stamp and the unsaved-work row as phase 9 built them

What later phases build on (paths under `skills/spec/tools/`):

- **Document** (`sessions/session-doc.ts`): `sessions/<base64url of sessionKey(ref)>.json`; `SessionDoc` is the
  `technical.md` shape plus `spec?`. Every Claude session shares `CLAUDE_CODE_SOURCE` (`claude-code`): codex-runtime-support
  has configured no Claude source key, and the id makes each file unique. Readers: `sessions/list.ts` (`readSessions`,
  `sessionsOnSpec`, `sessionLine`). No layout bump: an older plugin never writes the path.
- **Stamp** (`sessions/stamp.ts`): `stampSession(view, facts, now, change)` is a whole `replace`, no `ifVersion`, that
  carries mode/spec/title from the earlier document (`execute` when none) and takes the plan version from the spec's
  document. `withStamp(plan, facts, now)` hands it to the store as `alongside` ops (`record/plan-writes.ts`):
  outside the 50-op cap, yielding to a same-path op, written only when the plan itself changes something. Facts
  (`sessions/facts.ts`) are read once per command through a memoized thunk, never inside a plan, which reruns per tip.
- **Who stamps:** `sendRecordIntent` (phase actions, spec fields, cards) and, through `stampedBy`, `join`, `plan apply`
  and `card add`. Not stamped: `pr-sync`, `record sync`, upgrade-on-touch, `join --from-tree`. A write touching exactly one
  spec places an unregistered (execute) session on it. No stamp without `CLAUDE_CODE_SESSION_ID`.
- **Registration:** `spec.ts session register <mode> <spec> [--title]` (prep, create, review at entry) and `session end`
  (handoff). Never queued; board off or offline is one line, not an error.
- **Board:** `BoardInputs.sessionDocs` (last 7 days) and `thisHost`; attribution is claim → document → launch title →
  tree. `FocusWork.sessions` holds other hosts' sessions, with the phase from the claim joined by session id, and a
  remote claim a document explains is not shown twice. `board/unsaved-work.ts` makes the `unsaved-work` row (3 quiet
  hours, latest document per host+tree); `board/local-work.ts` recounts this machine's trees at load, so a push since
  the last write ends the row. Another machine's counts are as last written, which is why handoff ends the document.
- **Not built:** stale documents are never deleted by a write (reading each one on every write costs a git spawn
  apiece); the board ignores them after a week, and `session end` removes the finished ones.
