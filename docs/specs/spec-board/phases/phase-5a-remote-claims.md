---
needs: [5]
pr: B
---

# Phase 5a — Remote claims

**Goal:** `claim take` also creates a create-only ref, `refs/spec-claims/<spec>/<phase>`, on origin, and
`claim release` deletes it. Then a session on another machine (Taras) is refused the same phase, and the
board shows whose claim it is and how old it is.

**Outcome:** Two people on two machines never start the same phase · one push per take and one per release
· risk: a remote claim whose holder went silent needs an explicit takeover; offline sessions take only
the local claim and say so.

**Files to touch:**
- `skills/spec/tools/claims/remote.ts` (new)
- `skills/spec/tools/commands/claim.ts` (`--take-over`)
- `skills/spec/tools/board/inputs.ts`, `joins.ts`, `render.ts`
- tests: new `claims-remote.test.ts` (bare-repo origin in a temp dir); `claim-command.test.ts`, `board-lanes.test.ts`
- `skills/spec/execute.md` §1 (refusal and offline lines), `skills/spec/SKILL.md` (*Tools* → Claims)

## Implementation guidance

See `technical.md` → *claims* → *Remote layer*.

- Phase 5's local claim stays the guard for sessions on the same machine. The remote ref is the guard
  across machines.
- `take` order: take the local claim, then push the remote ref. If the push is refused, release the local
  claim and refuse with the remote holder's name.
- Liveness can't be checked across machines, so a remote claim is never taken over automatically.
- **Escape hatch:** there is always one. The refusal ends with `say "take it over" to take it anyway`, and
  on that word Claude runs `claim take --take-over`. It works on remote and local claims, live or not.
  Takeover prints the old holder's branch so the new session builds on their commits. The old holder's
  next release finds the lease changed and says who took it over.
- Network failure doesn't block: keep the local claim and print
  `claim: origin unreachable; claimed locally only`.

## Deliverables

- [x] Probe: GitHub accepts pushing and deleting `refs/spec-claims/*` with a create-only lease; confirm `gh`/`git fetch` read them back. Record the result in the ledger
- [x] `remote.ts`: `pushClaim` (commit-tree payload, `--force-with-lease=<ref>:` create-only), `deleteClaim` (lease on own sha), `fetchClaims`; race test, two pushers on one bare origin, exactly one wins
- [x] `claim take` pushes after the local take and rolls back the local claim on refusal; offline → local only + one line; `release` deletes the own ref
- [x] `--take-over` escape hatch: any claim, remote or local, live included; lease on the old sha; payload `takenFrom`; prints the old holder's branch; the old holder's `release` reports `taken over by …` and exits 0
- [x] Board: remote claims from other machines in flight with holder + age; older than `REMOTE_CLAIM_STALE_DAYS` under needs you; `--local` skips the remote
- [ ] `execute.md` §1: a refusal shows the holder and offers "take it over"; run `--take-over` only on the user's word; handoff shows a taken-over line; SKILL.md *Tools* Claims bullet mentions the remote ref and the hatch

## Phase-local notes

- The holder is identified by git `user.name`, the hostname and the claim's `sessionName`.
- Refs outside `refs/heads` and `refs/tags` are not touched by branch protection, and plain clones don't
  fetch them. The probe confirms this on GitHub.
- Phase 6 doesn't need this phase. It runs on top of phase 5's local claims.
