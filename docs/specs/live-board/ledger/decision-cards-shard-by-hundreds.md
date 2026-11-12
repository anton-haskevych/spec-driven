---
kind: decision
applies-to: [phase 8+]
created: 2026-11-11T20:09:56-08:00
---

# Cards live in folders of 100: `cards/<n div 100>/c<n>.json`

Card `c1234` is `cards/12/c1234.json`; the path follows from the id alone. Measured in phase 1
(`research/phase-1/2026-11-11-growth-measurement.md`): write time is the same either way at 2,000 cards, but a
flat `cards/` makes every card write rewrite and push the whole folder's tree (75 KB at 2,000 cards, growing
with each card); folders of 100 keep it at about 3.5 KB. Sources stay `sources/<card-id>/<letter>.json`
(a handful per card).
