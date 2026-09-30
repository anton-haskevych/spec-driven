---
kind: decision
applies-to: [phase 1]
created: 2026-09-30T15:16:12-07:00
---

# SKILL.md keeps its sub-command parse rules, aligned with `parseContextRequest`

The draft dropped SKILL.md's matching rules in favour of "use the pack's `spec=`". But `contextPack` returns nothing for prep, create, review, update, handoff, list and idea (`commands/context.ts:34`), and no-Bun/Codex/cloud sessions get no pack at all — those would lose their only parse (e.g. `/spec create checkout-v2` inferring a name from conversation, `/spec idea …` read as a spec name).

Decision: the tool implements the parse; SKILL.md keeps the rules as the fallback, rewritten to match (trailing punctuation stripped, chunk reference in the name slot becomes the hint). When a pack is present its `spec=` wins. A pre-PR check confirms the prose still matches the tool.
