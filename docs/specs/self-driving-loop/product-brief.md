# Self-Driving Loop — Product Brief

## Who & what
Anton, and any teammate running the spec loop, wants the loop to keep moving between his real decisions: the next session starts on one word from him, sessions on the same spec don't trip over each other, and every report tells him what changed in plain words.

## Why
A read of 70 CRM sessions: Anton pasted "1 … go" back ~35 times (one session sat idle two hours overnight waiting for it); parallel sessions on one spec collided over shared notes and were untangled by hand in ~12 sessions; every session re-ran the same start/close ritual by hand and often with an outdated plugin version; "merge the latest main" was retyped as a chore; ~25 times he had to ask "what's the impact?"; ~12 times he answered "yes" to a question that had an obvious answer.

## What we'll build
- **One-word pick:** handoff still lists what's ready and Anton picks; a bare "1" (or "1 3") launches it, and the launched session starts working without asking "go" again.
- **No collisions:** two sessions on one spec can both close cleanly; shared notes never need a hand merge.
- **No ritual:** starting and closing a session is one step each, always on the installed plugin version, from any folder.
- **Sync with main is one step,** including the project's after-sync checks; the board shows which PRs have fallen far behind.
- **Plain reports:** every report opens with the impact (measured where possible), what merging does, and what's left; internal labels are explained.
- **No needless questions:** good defaults are applied and listed under "say if wrong"; only real forks are asked.

## The real change
Between Anton's decisions the loop does the mechanical work itself; he makes the picks, and never has to relay, retype or re-confirm what the agent already knows.

## Where it touches (product level)
- Handoff and the start of every session
- Sessions running side by side on one spec
- Syncing a PR with main
- Every end-of-session and status report

## Out of scope
- Launching sessions with no pick from Anton (later, once picking has proven reliable), and carrying a PR to merged (`pr-babysit`).
- Getting new workspaces ready to build (dropped by Anton), and the project's own migration-check script (CRM work); the loop only runs what a project declares.
- Machine load / how many sessions run at once (CRM specs own it).
