---
kind: principle
applies-to: [phase 2+, load-bearing]
created: 2026-11-17T14:54:00-08:00
---

# One pure specLayout answers branch, base and ship-alone; nothing else guesses

`specLayout(state, meta)` in `T/pr/groups.ts` is the only place that decides:
- whether a spec is in spec-branch mode (`spec-branch: on`, an explicit field);
- each group's branch and base;
- which groups ship alone (the frozen `ship-alone:` list);
- the final PR's head (group `default` = `feat/<spec>`).

Commands build it once from loaded state and pass it down. Pure callers (`takeRefusal`, prune rules, `pickGroup`,
placement) take the layout and never call git.

Never infer the mode from `origin/feat/<spec>` existing: that name also belongs to ungrouped phases, and old
branches outlive their specs. Never record a tree's base in git config: it is per clone and missing on a reused or
taken-over branch. In spec-branch mode every code phase carries `pr:`, which is what frees group `default` to mean
the spec branch.

Source: review 2026-11-17 (code-quality F1–F3, principal F1–F2, integration F2/F8, prior-art F2/F4–F6, adversarial F4/F7–F9).
