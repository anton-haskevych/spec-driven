# Phase 2 preflight — plain reports, fewer questions

Inputs: `phases/phase-2-plain-reports.md`, `phase-2/2026-10-12-plain-reports-recon.md`, `principles.md`.
Prose-only chunk; the canon passes are mostly inert. Output follows the branch's preflight format
(*Defaults applied* / *Forks for you*, phase 1); the 2.44.0 plugin cache running this session still
has the old *Decisions for you* heading because phase 1 is not on main yet.

## Findings that change the plan

1. **Handoff runs update's report** (`handoff.md:17-19` follows update.md "through *Report and
   nudge*"), so "a handoff prints the header once" needs a home the update report sees. Put it in
   SKILL.md *Reports* (one rule) and have update.md §8's pointer say "skipped when handoff runs it".
2. **phase-preflight is its own skill** (`skills/phase-preflight/`), loaded standalone too, where
   `skills/spec/SKILL.md` is not in context. Its pointer must be a readable relative path
   (`../spec/SKILL.md` → *Say if wrong*), not a bare "SKILL.md → …" that would mean its own file.
3. **review.md §3 is two things** (`review.md:212-224`): the general criteria (move) and the
   review-only fork of graduation candidates plus the "how to ask" paragraph (stay). Moving the whole
   section would strip review of its graduation step.
4. **Line numbers in technical.md are at 2.41.0**: handoff's block is §4 `:154-168`, review's report
   §7 `:340-350`, execute's brief §9 step 3 `:146`. Edit by section, not line.

## Canon against the chunk

| Pass | Verdict | Consequence |
|---|---|---|
| Clean Code — one word per concept | Bites | `Say if wrong:` is already the label in execute.md:22, :98, :202, handoff.md:178, create.md:373; the new section keeps that exact label, no synonym |
| Clean Code — DRY / one home | Bites | Each mode gets one pointer line, never the three labels (craft → Don't extract: per-mode report bodies) |
| Clean Architecture, SOLID, DDD | Inert | No code |

## Amendments

1. SKILL.md *Reports* states: work reports only (execute end-of-chunk, handoff, standalone update,
   review); handoff prints it once and the update it runs skips it; not resume, status, babysit.
2. update.md §8 pointer: "opens with SKILL.md → *Reports* (skipped when handoff runs this flow)".
3. review.md §3 keeps its heading, points at SKILL.md → *Say if wrong* for the criteria, and keeps
   the graduation-candidate fork and the asking paragraph.
4. phase-preflight's two output sections name `../spec/SKILL.md` → *Say if wrong* for the split.

## Defaults applied

- Header goes in every handoff branch, the crew one included: the overseer relays it.
- update.md §9 *Close the phase* keeps its one line; the header belongs to execute's end-of-chunk brief that follows.
- Pins: three labels + `Say if wrong:` in SKILL.md; a loop over execute, handoff, update, review for
  `SKILL.md → *Reports*`; review.md and phase-preflight contain the *Say if wrong* pointer.

## Forks for you

None.
