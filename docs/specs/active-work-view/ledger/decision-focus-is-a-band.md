---
kind: decision
applies-to: [general, load-bearing]
created: 2026-10-08T14:54:17-07:00
---

# `focus:` is a band (must / should / could), not a rank

Decided 2026-10-08 while seeding CRM (phase 6). Anton found a strict 18-spec order "kinda hard to
split … in sequential order". He asked for tiers "that Taras could understand too, not just my
internal monologue". He then rejected a separate `tier:` beside `focus:` as blending two meanings:
"focus would be relationship of the entities within the tier".

- **Chosen:** one field, `focus: must | should | could` (MoSCoW). No field means not in focus,
  MoSCoW's "won't, this time". Inside a band the board orders by data: overdue → due → priority →
  name. Writer: `focus add|move <spec> <band>`, `focus drop <spec>`.
- **Rejected:**
  - A numeric rank. It needs a hand-kept total order nobody can maintain.
  - `tier:` beside `focus:`. Two fields for one idea.
  - Grouping FOCUS by `priority:` p1–p3. That would undo `decision-focus-is-not-priority`: 20 of 22
    prioritized CRM specs are p1, Taras never sets priority, and no level has a definition.
  - Now / Next / Later. Those words are taken on the board: the `now` column, `Next sessions:`, and
    Backlog for ideas.
  - Sprints or cycles. The 2.28–2.30 plan lists "No status pipeline or cycles" under not doing. A
    weekly re-band is a team habit, like growth's Wednesday pick, not a feature.
- **Kept:**
  - Storage in spec meta, no registry (`decision-focus-rank-in-spec-meta`).
  - Base-first writes.
  - Focus ≠ priority.
  - `ReadyRow.focus` = lane position (one `focusOrder`).
- **Legacy:** a number (2.37.0) reads as `should` with a doctor warning; `focus add` overwrites it.
