# Oversee One Spec — Product Brief

## Who & what
Anton wants to point one overseer at one spec and have it finish that spec with a crew of
background workers, while other overseers do the same for other specs at the same time.

## Why
On Nov 16–17 an overseer finished most of a 14-phase CRM spec overnight, but only by working
around the tool: it launched phases by hand to keep other specs out, every PR group waited
on its own merge to main before the next phase could build on it, and the crew sat idle for
two hours on a ship-mode question that had a sound default. Only one overseer can run per
repo, so a second spec can't get the same treatment.

## What we'll build
- Pointed at a spec, the overseer first lays out the build order: what can run side by side,
  the longest chain, and which phases to group or split so more runs in parallel. It applies
  the sound choices and lists them for Anton to overrule.
- Workers run that spec's phases in parallel whenever their phases don't collide.
- All of the spec's work gathers on one branch for that spec; workers build on each other's
  finished phases without waiting for merges. One pull request ships it at the end. A piece
  that has to go live early (a backend deploy another phase depends on) still ships alone.
- Several overseers run at once, one per spec, within a machine-wide limit on workers.
- Other sessions see that a spec has an overseer and go through it to change its plan.

## The real change
The overseer's unit of work goes from "the whole board" to "one spec", and a spec's work
gathers on its own branch instead of merging to main piece by piece.

## Where it touches (product level)
- The overseer mode and its crew of workers and PR babysitters
- How a worker starts its phase and hands it off
- The board, which shows who oversees a spec

## Out of scope
- Stacked pull requests
- Changing the whole-board overseer for those who still want it
- Starting work on tasks inside a phase before the whole phase is ready
