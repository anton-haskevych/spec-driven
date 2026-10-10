---
kind: gotcha
applies-to: [phase 7]
created: 2026-10-10T16:38:44-07:00
---

# Many failures spend `pr status`'s 30 gh calls before every log is saved; run it again

Seen live on CRM #922 (2026-10-10): 19 jobs failed (a pnpm self-installer break), and the 30-call budget
ran out after 8 logs. Rows without a log read `infra: unknown (no log (gh call budget (30) spent))`, never
`no`, and `pr rerun` refuses them as unclassifiable. One run took 43 s.

A second `pr status` gets further: saved logs cost no call. The procedure should first fix the shared
cause, which is usually visible in the first three tails, rather than walk every row. Nineteen failures in
one run are almost always one setup failure.
