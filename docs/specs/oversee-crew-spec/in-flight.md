# In-flight state

**Session ended:** 2026-10-12
**Active phase:** 1 — The overseer, fast path

## Where things stand

- 1.0–1.12 done and pushed: probes, wiring, `launch --bg --brief` + babysit `hold`, `pr hold`,
  `deploy:` setting, `phase deployed --land`, execute/handoff/update/babysit prose, `oversee-crew.md`
  (191 lines) and `crew-brief.md`. Full tool suite green (1082 tests) after 1.2; affected slices and
  typecheck green after every later commit.
- 1.13 is open on purpose: README and ROADMAP are written; only `python3 scripts/version.py --set
  <main's minor + 1>` remains, run at merge (ROADMAP says "next minor" until then).

## Implicit context

- `run.md` keeps `## Launched` (not `## Pending`): see `decision-one-home-per-crew-state`. technical.md
  is updated to match.
- Preflight ran for 1.3–1.4 only (`research/phase-1/2026-10-12-1.3-preflight.md`). 1.1–1.2 and the
  prose chunks went without one.
- Full `bun test` takes ~80 s; run it once at the PR gate.

## Pick up from here

- Phase 1 is at its PR gate apart from 1.13's version bump. Run the pre-PR checks in `pr-opening.md`.
  The dogfood check needs this branch's skill installed (the plugin cache is 2.42.0), so it runs after a
  release or with the branch installed locally; ask Anton which.
- Then execute.md §10's question for PR A.
