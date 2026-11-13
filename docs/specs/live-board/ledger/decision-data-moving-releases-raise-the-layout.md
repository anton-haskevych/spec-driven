---
kind: decision
applies-to: [phase 6, 7, 8]
created: 2026-11-11T19:41:31-08:00
---

# A release that moves data onto the record raises the layout and upgrades specs on touch

CRM turns the board on after PR B. PR C (spec fields, PR numbers), PR D (questions, hand-off notes) and PR E
(priority and due date onto cards) each move data that already-joined specs hold in files. Each one:

1. raises `RECORD_LAYOUT` (2, 3, 4), so a session on the previous release refuses to write and says to update,
   and can't write an owner or a hand-off note to a home the new side stopped reading (true from 2.54 on;
   2.53.0 doesn't refuse: `gotcha-2-53-writes-files-on-a-newer-record.md`);
2. adds one upgrade step in `plan/kinds.ts`: the next command that touches a spec whose `SpecDoc.layout` is
   behind copies that step's fields into the record in one batch;
3. keeps its readers falling back to the file home until the spec is upgraded.

Each PR's pre-PR scenario runs against a spec joined on the previous release. Source: review 2026-11-11, R8.
