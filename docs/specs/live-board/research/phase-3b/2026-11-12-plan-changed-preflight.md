# Phase 3b preflight — a session hears that the plan changed

Grounded in the recon note beside this file. Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **An offline fetch costs two timeouts, not one.** `fetchRecordTip` (`record/ref.ts:37-52`) runs `ls-remote`
   after any failed fetch, with the same `NETWORK` limit (`core/remote-push.ts:6-9`, 10 s). Against an
   unreachable host the hook's "3 s" would be 6 s, and today every offline write waits 20 s. A fetch that
   *timed out* is already unreachable: return `offline` without the `ls-remote`. The limit becomes a parameter
   (`fetchRecordTip(git, timeoutMs = REMOTE_TIMEOUT_MS)`), and the read port passes it through.
2. **The write's own change must not be reported back to it.** A plan re-run per tip lands *on top of* others'
   changes; diffing memory against the post-write tip would announce this session's own `add`. Diff against
   the view the plan last ran on (watched in `sendRecordIntent`, `plan/record-send.ts:47-50`), then remember
   the post-write tip, read locally: a landed push already moved the tracking ref (`record/ref.ts:24-27`).
3. **The phase file names "the outcome renderer from phase 3"**: that is `renderPhaseOutcome`
   (`plan/phase-writer.ts:64-77`). It renders a string from an outcome and knows nothing of the session; the
   notice is computed in `recordWriter`, where the world and session live, and carried on the outcome
   (`notice?: string`), printed *before* the result line (spec.ts: the last line is the result).
4. **Session key is the same in commands, packs and hook.** `CLAUDE_CODE_SESSION_ID` (Bash env, checked) equals
   the hook payload's `session_id`; with neither, the memory is off and nothing is printed.

## Clean Code / Clean Architecture / SOLID / DDD against 3b

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions, one thing | Bites | `plan-version.ts` splits shape, diff, memory: diff pure in its own file (`plan/plan-diff.ts`), memory file I/O in `plan/plan-version.ts` |
| No side effects in pure code | Bites | Hook decision `planChangedNotice(now, memory, read)` takes injected read; `import.meta.main` does I/O only |
| Errors are values / fail open | Bites | Memory read tolerates missing/corrupt JSON (as `hooks/lesson-recall.ts:47-53`); hook swallows and exits 0 |
| Dependency Rule | Bites | `core/` imports nothing from `plan/`; hook imports `plan/` + `record/` like `frozen-plan-edits` does |
| SRP by actor | Inert | One actor (the session) |
| OCP | Bites | Summary items are a list of small detectors (added, split, PR moved, tasks moved, edges); a new kind adds one |
| DIP | Bites | Hook reaches the record through `RecordReadPort`; tests drive the decision with a fake read |
| DDD | Inert | Tool plumbing; "plan version" is the existing word (`SpecDoc.planVersion`) |

## Amendments

1. `fetchRecordTip(git, timeoutMs)`; a timed-out fetch is `offline` with no `ls-remote` (own green commit).
2. `RecordWorld.watch?(view)` — `sendRecordIntent` wraps the plan to report the last view it ran on.
3. `PhaseOutcome` variants carry `notice?`; `renderPhaseOutcome` prints it first.
4. Hook checks only specs this session was already shown (memory keys); empty memory → no fetch, no output, so
   a session that never loaded a joined spec pays nothing.

## Defaults applied

- Memory keeps a small shape per spec (version, phase ids, PR, needs, task ids), not only the number: the
  record keeps no history to diff an old version against.
- First sighting of a spec says nothing; it only seeds the memory.
- The hook fetches only when `board.record` is on (readers' rule); off, it reads the local copy.
- One line, at most 5 items, then `+N more`; a version bump with no detectable change reads `plan edited`.

## Forks for you

None.
