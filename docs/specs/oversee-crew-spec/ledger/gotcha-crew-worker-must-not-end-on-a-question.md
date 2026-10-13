---
kind: gotcha
applies-to: [phase 1+]
created: 2026-10-12T20:15:42-07:00
---

# A crew worker that ends its turn on a question or Next sessions reads as `blocked`

handoff.md §4 asks §10's PR question, or prints *Next sessions*, both of which wait for a
reply. Wave 2c showed that a session ending on text like that reads `blocked` with no
`waitingFor`, so the overseer would park finished work. handoff.md §4's *Crew worker* branch
must come first: print the `Crew:` line, end with `Handed off.`, and ask nothing.

Also: a worker in a worktree can't Write under the main repo's `.git/`, because Anton's file
guard (`~/.claude/hooks/pre-tool-use/files/file-guard.ts:35-45`) denies it. So no
worker-written file may live under `<git-common-dir>`. spec.ts commands run as Bash and can
write there.
