---
kind: decision
applies-to: [general, load-bearing]
created: 2026-10-07T19:16:13-07:00
---

# Focus rank lives in the spec's own CLAUDE.md (`focus:`), owner in `owner:`

Asked 2026-10-07 at review, after prior-art challenged design decision 2. Anton chose the field.

- **Chosen:** `focus: <number>` in `docs/specs/<spec>/CLAUDE.md` frontmatter; the documented
  `owner:` key says whose it is. Read through `SpecMeta`, validated by `checkSpecMeta`, written with
  `setFrontmatterLine` / `removeFrontmatterLine`.
- **Rejected:** `docs/specs/_focus/<spec>.md` (one file per spec). It needed its own loader, two
  doctor checks, a hook regex and defenses for dangling entries (renamed, deleted, finished,
  branch-only specs): `unknown` / `branch-only` now-kinds, a `shipped → drop` row, a handoff drop step.
- **Why the old reasons didn't hold:** both options use N files; an appended key sits far from
  `updated:` so it merges cleanly; branch edits reach neither.

Consequence: never reintroduce a separate focus registry. A finished spec's leftover `focus:` is
harmless; the board hides it once no linked PR is open.

Since phase 7 the value is a band, not a rank (`decision-focus-is-a-band.md`); where it lives is unchanged.
