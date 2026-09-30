# Spec Loop Automation — Product Brief

## Who & what
Anton and Taras run every feature through the spec loop (prep → review → execute → handoff), one fresh session per chunk. They want the loop to carry the routine mechanics itself, so each session spends its effort on the feature, not on rebuilding the same procedure.

## Why
A read of 52 recent CRM sessions shows the same chores improvised again and again, each time a little differently:
- Sessions often start without their prepared context, so the agent rebuilds it by hand.
- The shared lessons list collides on almost every merge and gets untangled by hand (at least 6 sessions).
- Watching a pull request's checks and working out why one failed is redone from scratch (18 sessions; one session checked 45 times).
- Ticking progress, splitting phases and recording lessons are done by hand-edited text, which skips the safety checks.
- Copying spec notes to the main line happened three different ways and once wiped Anton's own edit.
- Handoff doesn't push, so a session's work can sit only on the laptop; Anton keeps having to ask "is this on the remote?"
- The plugin says "draft pull request", but CRM drafts run no checks, so every session argues it again.
- Anton has to say "you're running out of room" and "what does this phase actually do for me?" himself.

## What we'll build
A spec loop where these chores are one step the agent calls, each project states its own rules once (where spec notes live, draft or ready, what to rerun after syncing with main), and the loop checks and scaffolds those rules. Nobody runs anything by hand.

## The real change
The loop's routine mechanics move out of per-session improvisation and into the plugin itself, driven by rules each project declares once.

## Where it touches (product level)
- Every session start (resume / execute)
- Execute's pull-request and CI stage
- Handoff and closing a phase
- Project rules for CRM (the first adopter)

## Out of scope
- Mass-migrating CRM's existing specs, lessons or notes. They fill in as specs run.
- Anything CRM-specific baked into the plugin; that belongs in CRM's own project rules.
- New commands Anton types; everything fires inside the loop.
