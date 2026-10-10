# PR Babysit — Product Brief

## Who & what
Anton, and any teammate running the loop, wants a finished pull request carried all the way to merged — checks green, merged, recorded — without him watching it, after one yes from him.

## Why
Every session invents its own way to wait on CI (130 hand-made wait loops in 70 sessions). Anton is the CI watcher: he pastes failing checks back into sessions, finds out about failures only when he takes a PR out of draft (drafts run no CI), and one PR took two hours of check-ins over checks that didn't matter (website previews). Each PR costs 30–70 minutes and his attention.

## What we'll build
At the moment a PR is ready, the agent asks one question:
"PR is ready. Open it and babysit it until every check is green, then merge? Or open it as a draft for now?"
On "babysit", the agent: opens it ready, waits quietly (no spam), and when a check fails it works out whether the failure is ours, already fixed on main, or a known flaky test — fixes and pushes, reruns, or stops and asks. When everything that matters is green it merges with the project's method, records the merge in the spec, and tells Anton once.
Every agent follows the same written steps, every time. No more reinventing.

## The real change
Getting a PR from "ready" to "merged" becomes one owned step of the loop, with a single decision from Anton at the start, instead of a chore each session improvises.

## Where it touches (product level)
- The moment a spec's code is done and its PR is ready
- The end-of-session report and the board (which PR is being babysat, what's left)
- Anton's approval: one question per PR, never a merge without his yes
- Teammates' sessions on their own machines

## Out of scope
- Making CI itself faster or changing which checks exist
- Reviewing or merging other people's PRs
- Watching deploys after merge
