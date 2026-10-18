---
kind: decision
applies-to: [general, load-bearing]
created: 2026-10-17T20:59:58-07:00
---

# Owners are spec-level only

`owner:` lives on a spec's `CLAUDE.md`. Phases and backlog ideas carry no owner, and nothing reads
one there. There is no "phase beats spec" rule.

- **Rejected:** phase and idea owners overriding the spec's (the prep brief's original scope), with
  `spec.ts owner <spec> [<phase>] …` as their setter.
- **Why:** without a setter, the only way to set one was a hand edit on a branch, which base readers
  (board, crew, the other machine) never see until merge — the very path the "How an owner is set"
  decision rejects. No phase or idea in CRM has an owner. Cutting it also removed the pack filter,
  the phase-owner parse and doctor check, and every "phase ?? spec" resolution site.
- **Who:** Anton, review 2026-10-17 (`reviews/2026-10-17-crew-gate-and-offer-filter.md`).
- **If it's ever needed:** add an optional phase argument to `spec.ts owner`, landing on the phase
  file through `landOnMain`, and give `ownerOf` a phase parameter.
