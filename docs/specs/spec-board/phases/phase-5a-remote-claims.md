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
- Liveness can't be checked across machines, so a remote claim is never taken over automatically. It can
  be taken over with `claim take --take-over`, which pushes with a lease on the old sha.
- Network failure doesn't block: keep the local claim and print
  `claim: origin unreachable; claimed locally only`.

## Deliverables

- [ ] Probe: GitHub accepts pushing and deleting `refs/spec-claims/*` with a create-only lease; confirm `gh`/`git fetch` read them back. Record the result in the ledger
- [ ] `remote.ts`: `pushClaim` (commit-tree payload, `--force-with-lease=<ref>:` create-only), `deleteClaim` (lease on own sha), `fetchClaims`; race test, two pushers on one bare origin, exactly one wins
- [ ] `claim take` pushes after the local take and rolls back the local claim on refusal; `--take-over` with lease; offline → local only + one line; `release` deletes the own ref
- [ ] Board: remote claims from other machines in flight with holder + age; older than `REMOTE_CLAIM_STALE_DAYS` under needs you; `--local` skips the remote
- [ ] `execute.md` §1 remote refusal names the holder and suggests `--take-over` only on Anton's say-so; SKILL.md *Tools* Claims bullet mentions the remote ref

## Phase-local notes

- The holder is identified by git `user.name`, the hostname and the claim's `sessionName`.
- Refs outside `refs/heads` and `refs/tags` are not touched by branch protection, and plain clones don't
  fetch them. The probe confirms this on GitHub.
- Phase 6 doesn't need this phase. It runs on top of phase 5's local claims.
