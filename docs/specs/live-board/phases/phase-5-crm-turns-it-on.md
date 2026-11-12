---
needs: [4]
code: false
gate: outward
---

# Phase 5 — CRM turns the board on

**Goal:** CRM Dance runs with the shared record on, on both Anton's and Taras's machines, and the fix for the
clashes is seen working on a real spec.

**Outcome:** from this day a spec that is worked on in CRM joins the board, and its sessions see one plan ·
half an hour of hands-on work · the risk is a session still on the old plugin version, so both people update
and restart first.

## Implementation guidance

The switch is one line in CRM's `docs/specs/_playbook/settings.md` (`board: { record: on }`), committed to
CRM's main. Before it goes in, the release that carries PR B must be installed on both machines and every
running session restarted: a session on an older version can't see the record and would read a joined spec's
frozen files (`design.md` → *Edge cases*).

Pick the first spec to join deliberately: one with two open PR groups, so two trees exist. Run one session in
each, tick a task in each, and check that each session's next command shows the other's tick.

The follow-up count a week later is the spec's main success metric. The baseline is in `progress.md`.

## Deliverables

- [ ] The release with PR B is installed on Anton's and Taras's machines and their running sessions are restarted
- [ ] Gate: Anton says to turn it on
- [ ] `board.record: on` is on CRM's main
- [ ] A first CRM spec has joined; two sessions in two trees each ticked a task and each saw the other's on its next command; `record export` on a scratch copy gives back the same lists
- [ ] One week later: the count of spec-docs-only commits on CRM's main and of `diverged on main` hand-offs, against the baseline

## Phase-local notes

- The way back is per spec: `record export <spec> --unjoin` writes the lists back into files and takes the
  spec off the record. Turning the line to `off` only stops more specs joining; a joined spec stays read from
  the record in every tree, whatever the checkout's copy of the setting says.
- CRM runs `docs: main`, which the board needs. CRM has no pre-push hook (checked 2026-11-11), so the tick's
  save-push skips nothing there.
- A Codex pilot can read a joined spec and can't tick it (`ledger/decision-codex-reads-the-board-refuses-writes.md`).
  Pick a first spec with no Codex session on it.
