---
kind: gotcha
applies-to: [phase 6]
created: 2026-10-08T15:10:02-07:00
---

# The doctor reads the checkout, so a stale one hides focus warnings

`spec.ts doctor` checks the files in the working tree; the board and `spec.ts focus` read
`origin/<default>`. On 2026-10-08 CRM's main checkout was 126 commits behind origin, so the doctor said
`clean` for the four specs whose 2.37.0 numeric `focus:` lives only on origin, while the board already
listed them under SHOULD. To check what main really holds, run the doctor in a tree at a fresh
`origin/<default>` (or on a `git archive origin/main docs/specs` export), not in a lagging checkout.
