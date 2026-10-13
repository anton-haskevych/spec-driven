# Phase 2 recon — plain reports, fewer questions

One pass, read directly: technical.md → Phase 2 already named every seam; line numbers below are after
the phase 1 merge (f5d9dfa), so several moved from technical.md's 2.41.0 numbers.

## Seam

- `skills/spec/SKILL.md:155-172` *Next sessions*. New *Reports* and *Say if wrong* go right after it
  (before `# Spec layout reference`), so both sit in the always-loaded top half.
- Report sites (each gets one pointer line, no copy):
  - `execute.md:146` §9 step 3, "Brief the user in 2–3 sentences: what shipped, what's next."
  - `handoff.md:156-170` §4 *Signal completion* block. handoff §1 (`:17-19`) runs update.md through
    *Report and nudge*; that report must skip its header when handoff runs it.
  - `update.md:145-168` §8 *Report and nudge*.
  - `review.md:340-350` §7 *Report and stop*.
- Criteria to move: `review.md:212-224` §3 *Sort forks* — "Resolve yourself" paragraph + "Put to the
  user" bullets. The graduation-candidate bullet and the "how to ask" paragraph are review-specific
  and stay in review.md.
- `phase-preflight/SKILL.md:138-148` *Defaults applied* / *Forks for you* restate the criteria; point
  them at *Say if wrong*. `:158` "Do not ask taste questions" is the same rule in short.
- `update.md:22` "If multiple phases are in progress, ask the user which phase" → take the phase this
  tree's claim names (`spec.ts claim list`).
- `execute.md:22`, `:98`, `:202`, `handoff.md:178`, `create.md:373` already say `Say if wrong:`; they
  can stay as is, the new section defines the label.

## Reuse

- Outcome lines: create.md:282 defines them ("first sentence is what the status table shows"); the
  execute pack holds the picked phase entry. Impact reuses that sentence; no new field.
- Left: `spec.ts ready <name>` (ready set, waiting, PR groups) — same source Next-chunk rule uses.
- babysit.md:104-113 already prints an `On merge:` line in its own shape; it stays (design.md).

## Testing-issue estimate

- Prose only; the green bar is `skill-wiring.test.ts`. The thin-skill loop at :101-112 is the pattern
  for the per-mode loop pin. No fixtures needed; the file is 182 lines, well under the cap.
- `context.test.ts:315` pins `` `Say if wrong:` `` in the no-spec pack line; unaffected.
