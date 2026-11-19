---
title: One-spec crew gaps found running available-visits-agree-everywhere
tags: [crew, spec-workflow]
created: 2026-11-18T21:14:12-08:00
---
Found overseeing CRM's available-visits-agree-everywhere (2026-11-18, 2.64.0), each worked around by hand:
1. A worker blocked after ending on text gets "Hand off now" forever; tick never closes it out (overseer had to `claude stop`).
2. Close-out reads the Crew line from the last turn only; an overseer message pushes it out.
3. A lane phase closed by `--evidence` (no commit) never passes "merged back"; its rows stay in the run, so it never ends finished.
4. A phase whose tasks are all dropped stays open; needs a dummy Gate task.
5. `phase add --needs none` writes the literal "none".
6. Spec-branch mode can't move a phase out of the final PR (no lane refused, ship-alone frozen at start).
7. No standing launch note: Anton's "persona-council after preflight" rule forced every launch by hand.
