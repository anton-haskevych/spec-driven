# PR Opening — Oversee One Spec

## Spec state

Spec written 2026-11-17 from prep (waves 1–2 + craft) and a persona council on the 8 open decisions.
6 code phases + 1 task phase (CRM adoption, no PR here).
Split: **PR A: phase 1** · **B: phase 2** · **C: phases 3, 4** · **D: phases 5, 6**. One minor version each,
picked at merge (main's minor + 1). Phases 1 and 2 start in parallel; 3 after 2 (it reads `specLayout`); 4 and 5 after 3; 6 last.
PR A alone keeps one worker per spec; parallel lanes switch on with PR C (`decision-lanes-ship-with-the-spec-branch`).
PR #50 merged 2026-11-17 as 2b5573e (squash).

## Pre-PR checks

- [x] gate: pre-pr
- [ ] Whole-board crew unchanged: `crew-tick.git.test.ts`, `crew-launch.git.test.ts`, `crew-overseer-command.git.test.ts` pass untouched (phases 1, 3)
- [ ] Every new `.git.test.ts` listed in `real-git/allowlist.ts` with `REAL_GIT_CAP` raised in the same diff
- [ ] New and touched tool files under 250 lines
- [ ] `python3 scripts/version.py --set <v>` and the ROADMAP row in the same PR
