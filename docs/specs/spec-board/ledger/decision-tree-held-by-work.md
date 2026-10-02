---
kind: decision
applies-to: [phase 7+]
created: 2026-10-02T16:21:57-07:00
---

# A tree is held by work, not by an open tab; prune asks a different question

Two rules, two functions in `trees/find.ts`:

- **`treeHolder`: may another session work here?** (place, launch, board.) Held when another session has a
  live or unknown claim on the tree, is live in it and mid-turn, or is live in it while the tree has
  uncommitted changes. An idle, claim-free session in a clean tree is a controller tab, not a holder.
  Unreadable sessions → claims alone decide. The board can't see uncommitted changes (full status across
  trees ~9 s on CRM), so its rows are advisory and `trees place` is the gate.
- **`treeOccupant`: may this tree be deleted?** (prune.) Any other live session in it, any live or unknown
  claim, or unreadable sessions keep it.

**Why:** CRM 2026-10-02, teacher-credit-payroll `pr-b`: two handed-off sessions left open in one tree each
refused to launch the next phase because of the other, for about 80 minutes. Anton keeps the tab he talks to
open and launches the next phase from it; that has to work. A merged tree still running a local stack from an
idle tab must not be pruned.
