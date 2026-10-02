# Phase 5a — docs chunk: recon

Seam (paths under `skills/spec/`):
- `execute.md:35-38`: *Claim the phase first* bullets. Add the take-over offer on a refusal that ends with
  `say "take it over"`, `--take-over` only on the user's word, the `their work is on <branch>` line, and the
  offline line.
- `handoff.md:154` (release) and `:168` (Signal completion): release can now print several `claim:` lines,
  including `was taken over by …`. Make it "lines".
- `SKILL.md:100`: the *Tools* → Claims bullet. Add the origin ref, the offline fallback and the hatch.

Reuse: none needed. Tests: `tools/tests/skill-wiring.test.ts` doesn't assert claim wording, so nothing to update.
