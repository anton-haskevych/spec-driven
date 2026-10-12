# Oversee Crew — Product Brief

## Who & what
Anton, and any teammate running the spec loop, wants one session to run his spec work across several parallel workers: it keeps a set number of workers busy on the most important ready work, ships each PR the way its spec says, and comes to him only for reviews, approvals and decisions.

## Why
On Oct 11 one session ran 3 lanes plus PR babysitters by hand for 5½ hours and shipped 3 PRs to prod. It worked, but everything was improvised. Workers refused approvals passed along by message. A deploy went out before its stop rule reached the worker. His questions got lost, or were asked 8 times. Slots sat idle up to an hour waiting on him. A review server ran for hours and blocked other workers. He typed "check in with the agents" five times and closed leftover tabs himself.

## What we'll build
- **An optional overseer session** (`/spec oversee-crew`) that writes no code. It picks the next ready work by focus, priority and dependencies, and starts a fresh worker for each phase with a written brief. It checks every handoff before counting it, and closes finished workers.
- **A standing go written in the repo:** how many workers, what the overseer may approve, what stays Anton's. Workers check it themselves instead of trusting a message.
- **A ship mode per spec:**
  - **auto:** babysit to green, merge, then deploy the way the project declares.
  - **review:** open the PR, get CI green, mark it "awaiting review", stop. Nothing is left running on his machine.
- **Waiting on Anton never holds a worker.** The work parks, and his question joins one queue that is asked once. The slot takes other ready work that needs no one.
- **Pause and resume** from a saved state.
- **Work is always on the remote,** with or without the overseer. A branch is pushed the moment work on a PR, phase or spec starts, and again after every commit. An interrupted phase can be picked up from any machine, and anyone can see who is working on what.

## The real change
Coordination moves out of one session's memory and messages into files every session can read. The overseer keeps workers busy without Anton relaying, re-confirming, or watching the babysitters.

## Where it touches (product level)
- Starting, watching and ending worker sessions
- What a worker reports back at handoff
- The PR moment: auto vs review
- The board's "needs you" list, and Anton's approvals

## Out of scope
- A general deploy tool, reserving migration numbers, or a review environment booted on demand (later)
- Running workers in the cloud
- Being required: sessions without the overseer work exactly as today
