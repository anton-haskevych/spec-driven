# PR Opening — Oversee One Spec

## Spec state

Spec written 2026-11-17 from prep (waves 1–2 + craft) and a persona council on the 8 open decisions.
6 code phases + 1 task phase (CRM adoption, no PR here).
Split: **B: phase 2** · **C: phases 1, 3, 4** · **D: phases 5, 6** (phase 1 moved from PR A to C on 2026-11-17). One minor version each,
picked at merge (main's minor + 1). Phases 1 and 2 start in parallel; 3 after 2 (it reads `specLayout`); 4 and 5 after 3; 6 last.
Phase 1 keeps one worker per spec; parallel lanes switch on with Phase 3 in the same PR C (`decision-lanes-ship-with-the-spec-branch`).
PR #50 merged 2026-11-17 as 2b5573e (squash).

## Pre-PR checks

- [x] gate: pre-pr — PR C 2026-11-17: 2380/2382 in the full run; the two 5 s timeouts (`land-on-main.git`, `codex-packaged-entry.git`, untouched here) pass alone; typecheck clean
- [x] Whole-board crew unchanged: `crew-tick.git.test.ts`, `crew-launch.git.test.ts`, `crew-overseer-command.git.test.ts` pass untouched (phases 1, 3) — expectations unchanged; only `await` and new required fields in two fakes
- [x] Every new `.git.test.ts` listed in `real-git/allowlist.ts` with `REAL_GIT_CAP` raised in the same diff — `publish-merge-back.git.test.ts`, cap 74 → 75
- [x] New and touched tool files under 250 lines
- [x] `python3 scripts/version.py --set <v>` and the ROADMAP row in the same PR — 2.63.0 for PR C
