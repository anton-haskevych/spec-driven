---
kind: domain
applies-to: [phase 5a]
created: 2026-10-01T16:54:48-07:00
---

# GitHub honours leases on `refs/spec-claims/*` (probe, 2026-10-01)

Probed against `anton-haskevych/spec-driven` with `git push --porcelain`:

| Push | Result |
|---|---|
| `--force-with-lease=<ref>: A:<ref>` (ref absent) | `*` new reference, exit 0 |
| same, `B:<ref>` (ref = A) | `!` `[rejected] (stale info)`, exit 1 |
| `--force-with-lease=<ref>:<B> C:<ref>` (ref = A) | `!` `[rejected] (stale info)`, exit 1 |
| `--force-with-lease=<ref>:<A> C:<ref>` | `+` forced update, exit 0 |
| `--force-with-lease=<ref>:<A> :<ref>` (ref = C) | `!` `[rejected] (stale info)`, exit 1 |
| `--force-with-lease=<ref>:<C> :<ref>` | `-` `[deleted]`, exit 0 |

- Payload: `git commit-tree <empty tree> -m <json>`. GitHub stores the commit; `git log -1 --format=%B` returns the JSON.
- Read back: `git fetch origin '+refs/spec-claims/*:refs/spec-claims-remote/*'`, `git ls-remote origin 'refs/spec-claims/*'`
  and `gh api repos/<o>/<r>/git/matching-refs/spec-claims` all list the ref.
- `stale info` is the client-side check against the advertised ref. In a true race the server's old-oid check fires
  instead, with a different message (`[remote rejected]`). Parse any `!` porcelain line as "refused" and read the
  holder back, without depending on the message.
- The fetch refspec does not prune. Use `--prune` on it, or deleted claims linger in `refs/spec-claims-remote/`.
