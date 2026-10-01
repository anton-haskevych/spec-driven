# Spec Spin-off — Product Brief

## Who & what
Anton works one spec per session. Mid-session the work often reveals another spec that's needed
(a blocker, a dependency, a universal system). He wants that new spec started properly in its own
fresh session, without re-explaining what was already decided.

## Why
Today the busy session writes the new spec itself, on a nearly full context, or leaves a thin stub.
Both lose things: Anton's exact rules get paraphrased, recon already done is redone or dropped, and
"this spec waits on that one" ends up as prose the tools can't check. Opening a fresh session by hand
is enough friction that the agent ends up doing it inline anyway. It happened twice on 2026-09-30.

## What we'll build
When a new spec is needed mid-session, the agent writes a short seed for it (Anton's words, what's
decided, recon already done, what the current spec needs from it) and opens a fresh session that
preps from that seed. The busy session goes back to its own work. The current spec can wait on the
new one, and the tools understand that wait.

## The real change
Starting a new spec from inside another spec's session becomes a handover to a fresh session, not
inline work.

## Where it touches (product level)
- Prep, when asked for a new spec in a session that already works another spec
- Writing a spec that depends on specs that don't exist yet
- The "what's ready / what's blocked" view

## Out of scope
- Reading the parent conversation's full transcript automatically (later, if seeds lose nuance)
- Running prep unattended in the background
- Terminals other than iTerm and Terminal.app (others get the command to paste)
