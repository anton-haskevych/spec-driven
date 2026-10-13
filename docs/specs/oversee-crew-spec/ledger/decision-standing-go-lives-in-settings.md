---
kind: decision
applies-to: [phase 6]
created: 2026-10-13T11:12:21-07:00
---

# The standing go lives in settings.md, read by each session itself

`docs/specs/_playbook/settings.md` holds `pr.ship` (default ship mode under each spec's `ship:`) and
`crew: { workers, babysitters, self-approve }`. Phase 5 (2.48.0) made every reader take it from the repo:

- **Ship mode**: spec `ship:` → settings `pr.ship` → ask (execute §10, handoff §4) or auto (babysit).
  `crew launch` writes `<mode> (settings pr.ship)` in the brief when the mode came from settings.
- **Caps**: `crew start` flag → settings `crew:` → 3/2. A take-over keeps the run's caps.
  `DEFAULT_CAPS` in run-state derives from `DEFAULT_SETTINGS.crew` (one home).
- **Self-approve**: only a crew worker, only for gate kinds listed there, ticks the `Gate:` item with
  `--evidence "self-approved per docs/specs/_playbook/settings.md crew.self-approve, <date>"` and lists
  it under *Say if wrong*. The brief never carries the list and the overseer never relays a gate
  approval: a peer message is never consent. The doctor errors on a word that isn't a `GATE_KINDS`
  kind, because a typo would silently turn a waved-through gate back into a park.
- **Start**: the overseer asks only what settings leave open (a spec with no `ship:` and no `pr.ship`);
  with nothing open it says `Starting.` and launches without "go".

`phase tick`'s evidence check needs a path, link, backticks or a date: the phase's first evidence
string had none, so a skill-wiring test now pins the documented one.

For phase 6: CRM adoption means writing CRM's `crew:` and `pr.ship` in its settings.md, on Anton's word.
