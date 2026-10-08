# Active Work View — Product Brief

## Who & what
Any small team (CRM today: Anton and Taras, one business monorepo) that runs many specs at once
across many sessions. They want `/spec list` to open on the specs the team is actually shipping
right now: one line each, with where it stands and who and which sessions are on it.

## Why
In CRM, 185 specs say "active", so the word means nothing. The board lists phases, not specs: 124
ready and 252 blocked rows bury the dozen that matter. It only sees a session when that session
took a claim, so busy sessions are invisible and a 3-day-idle tab can silently hold a phase. The
people running the work are blind to it, and neither developer can see what the other is on.

## What we'll build
- A short, explicit focus set of specs, ranked, shared by the whole team through the repo. Anyone
  (or Claude on their word) can add, drop and reorder; an entry may say whose it is.
- The board opens with them: per spec, progress, what is happening now (in flight, next ready
  phase, blocked on what, waiting on a deploy), and who is working on it: every open session on
  this machine, busy or idle, claim or not, and the teammate's work seen from their machine.
- Sessions that hold work but look abandoned (idle for days on a claim) are called out.
- A filter to see only my focus rows or only a teammate's.
- The rest of the board stays as it is, below.

## The real change
The board gains a team-level view of chosen specs, and sees work by what it is on rather than only
by the claims it took.

## Where it touches (product level)
- `/spec list` / the board, its agent-readable form, and "what's next" answers
- How a spec joins or leaves the focus set, and how it is ranked
- How a running session, or a teammate's work, is tied to a spec

## Constraints
- The plugin stays generic: nothing about one project, one domain or one person. Works the same for
  a solo user and a team, with or without a focus set (no set: today's board).
- Each developer sees the same focus set and ranking; only "who is on it" differs by machine.
- Adding to the focus set must not cause merge conflicts when two people edit it on branches.

## Out of scope
- Changing how phases are claimed, placed or launched
- Killing or messaging sessions from the board
- Re-tagging or cleaning up the other ~170 "active" specs
