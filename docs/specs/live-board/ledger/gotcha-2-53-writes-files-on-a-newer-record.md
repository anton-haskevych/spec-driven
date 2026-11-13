---
kind: gotcha
applies-to: [phase 6, 7, 8, load-bearing]
created: 2026-11-13T00:18:37-08:00
---

# 2.53.0 writes the files when the record is on layout 2: update every install before CRM's first 2.54 write

The released 2.53.0 reads a record whose `meta.json` layout is newer as "no record" (`record/read.ts` →
`newer`), so `planSourceOf` serves every spec from files. Its phase commands then edit the frozen phase files
in that tree, and `owner`, `focus`, `ship` and `spec-status` land on `CLAUDE.md` on main, a home 2.54 no
longer reads for an upgraded spec. Nothing refuses; the change is silently lost. Only `writeRecord` itself
refuses, and 2.53 never reaches it.

Found running PR C's pre-PR scenario (2026-11-13): after this branch upgraded `demo` to layout 2, 2.53.0's
`phase set demo 2 --title Again` printed `set: phase 2 · title "Again"` (a file write) instead of the
older-plugin line.

- **Fixed forward in 2.54:** `phaseContext.writerFor` and `writeJoinedField` refuse with
  `record: this plugin is older than the board's layout; update it` when the read is `newer`
  (`tests/record-newer-layout.test.ts`). PR D's and E's layout raises are safe against 2.54.
- **For 2.53 → 2.54 itself** no code can help: every machine that writes CRM (Anton's, Taras's, crew
  workers) must run 2.54 before the first 2.54 command touches a joined CRM spec. Say so at the merge.
- `pr merge` on a newer record still lands the merge line on main (`SpecPlans` carries no read kind); harmless,
  since the PR document is refreshed by the next `pr status` on 2.54+.
