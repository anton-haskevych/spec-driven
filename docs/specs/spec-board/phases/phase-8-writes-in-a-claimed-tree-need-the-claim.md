---
needs: [7]
pr: C
---

# Phase 8 — Writes in a claimed tree need the claim

**Goal:** a session that holds no claim doesn't commit, merge, reset or edit files in a tree another live
session has claimed.

**Outcome:** the tab you keep open as a controller can still read, check and launch, but it won't
trample the phase running next door. If you ask it to "merge main", it tells you which session holds the
tree and offers to ask that session · skill text · low risk.

**Evidence** (CRM transcripts 2026-10-02): at 21:34 Anton asked the handed-off phase 2 session to
"merge main into the branch". It merged and pushed one minute after the phase 3 session handed off in
the same tree. It checked `claim list` first, but only because it happened to think of it. Had phase 3
still been mid-task, the merge would have landed in its working tree.

**Files to touch:**
- `skills/spec/SKILL.md` *Session lifecycle*

## Implementation guidance

Recon (`research/phase-8/2026-10-02-claimed-tree-writes-recon.md`) priced a guard hook: a bun start, a
`git rev-parse` and a `ps` call on every Bash and Edit in every `/spec` session, plus a Bash parser the plugin
doesn't have. The standing rule (`spec-loop-automation/ledger/decision-no-bash-guard.md`) lets a guard in only
for a repeated, observed failure; this one was seen once, by a session that checked claims on its own. So the
phase is the rule, written where every `/spec` session reads it. The guard waits until the failure recurs
(`ledger/decision-controller-tab-checks-claims-no-hook.md`, which holds the design to build then).

## Deliverables

- [x] SKILL.md *Session lifecycle*: a session that handed off may stay open as a controller; before writing in a tree it runs `claim list`, and when another live session holds the tree it tells the user and offers `SendMessage` instead of writing
- [x] Decision recorded: no guard hook until the failure recurs, with the design to build then
