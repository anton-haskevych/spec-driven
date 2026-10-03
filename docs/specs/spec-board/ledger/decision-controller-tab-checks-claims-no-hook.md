---
kind: decision
applies-to: [phase 8+]
created: 2026-10-02T17:10:19-07:00
---

# A controller tab checks `claim list` before writing in a tree; no guard hook

A session that handed off may stay open as the user's controller tab (phase 7 made that the normal pattern).
Before it writes in a tree again (commit, merge main, push, edit), it runs `claim list`; if another live
session holds a claim on that tree, it tells the user and offers to ask that session through `SendMessage`.
The rule lives in SKILL.md *Session lifecycle*. There is no PreToolUse guard.

**Why no hook:** the standing rule (`spec-loop-automation/ledger/decision-no-bash-guard.md`): a tool earns its
place only by removing a repeated, observed failure. This one was seen once (CRM 2026-10-02 21:34: the phase 2
tab merged main into the tree one minute after phase 3 handed off; no damage), and that session already ran
`claim list` on its own. A guard would add a bun start, a `git rev-parse` and a `ps` call to every Bash and
Edit call in every `/spec` session, plus a Bash parser the plugin doesn't have (zero dependencies).

**Revisit when:** a controller tab writes over a claimed session's work again. Then build the guard as a
skill-frontmatter PreToolUse hook with an `if:` pre-spawn filter (`Bash(git *)`, Write/Edit paths), reading
`claims/live.ts` `heldByOthers`; prior design in `spec-loop-automation/ledger/decision-bash-writes-denied-not-swept.md`.
