---
kind: gotcha
applies-to: [phase 3]
created: 2026-10-12T23:38:07-07:00
---

# The overseer still reads a worker's single in-flight.md

`oversee-crew.md:179-180` reads a crew worker's `## Needs you` from `origin/<branch>:docs/specs/<spec>/in-flight.md`. After phase 3, workers write `in-flight/phase-<id>.md`, so until that line changes the overseer misses their questions (the `Crew:` line still names the file and the count).

Not edited here: oversee-crew-spec phase 4 was editing `oversee-crew.md` in parallel (2026-10-12). Whichever of the two PRs lands second points those lines at `in-flight/phase-<id>.md` (and `in-flight/pr-<group>.md`), keeping the legacy file as a fallback.
