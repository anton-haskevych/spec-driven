---
kind: decision
applies-to: [phase 5a, 6]
created: 2026-10-01T16:52:04-07:00
---

# Claims: how phase 5 landed, for remote claims and loop wiring to build on

- **Command output** is the contract execute.md reads: `claim: …` = this session holds it (took, took over,
  already yours, released); `claim refused: …` = stop or re-pick. 5a's remote refusal and "take it over"
  offer must keep that prefix.
- **Store** (`claims/store.ts`) knows no sessions; `takeClaim(dir, claim, isStale)` gets the predicate from
  `claimStatus`. 5a's `--take-over` is an `isStale` that returns true, plus the remote push.
- **One status path.** `claims/held.ts` `claimContext`/`heldClaims` feed both the board loader
  (`BoardInputs.claims: HeldClaim[]`, status `unknown` under `--local`) and `commands/claim.ts`. Remote claims
  in 5a should arrive as more `HeldClaim`s, not a second lane rule.
- **Packs** read only `heldByOthers` (`claims/live.ts`): other sessions' claims that are live or of unknown
  liveness, i.e. exactly what `take` would refuse. The caller's own claims never count
  (`CLAUDE_CODE_SESSION_ID`). A hinted phase is still picked.
- **Board** joins a claim's own session first; a `closed` claim → session cell `closed` + needs-you
  `{ kind: "claim" }`. `gone`/`done` claims are hidden; only `take`/`release` prune them.
- **Phase 6** can rely on `holder` in `board --json` in-flight rows and on handoff already printing the
  release's `claim:` line in *Signal completion*.
