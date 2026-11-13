# Fast Tests — Product Brief

## Who & what
Anton, and every agent session working on the spec plugin, wants the plugin's test suite to finish in a
couple of minutes and to stay that fast as new work adds tests.

## Why
The full suite takes 4.5–6.5 minutes before every PR, and longer when several sessions share the Mac.
About a quarter of the test files build real git repositories on disk, mostly to prove logic that has
nothing to do with git. Agents write that kind of test by default, so the suite gets slower with every spec.
A written principle against it already exists and was not followed.

## What we'll build
- A check that fails while a test is being written if it reaches for real git without a reason, says the
  rule in its message, and points at the fast in-memory stand-ins.
- Proof that the in-memory stand-ins behave like real git, so fast green tests can be trusted.
- A way for command tests to use the stand-ins (today most commands can't be tested without real git).
- Two speeds: the quick suite on every commit, the real-git tests before a PR.
- The rule shown to an agent the first time a new test runs (the guard's red message).
- The existing real-git tests rewritten onto the stand-ins, slowest first, keeping real git only where
  the code under test runs git itself; measured before and after.

## The real change
Real git in a test becomes the exception that must justify itself, enforced by a red test — not a reviewer —
and the tests that break that rule today are rewritten so the suite is actually fast.

## Where it touches (product level)
- The plugin's test suite and its guard tests
- The pre-commit and pre-PR checks every spec session runs
- The lessons shown to agents before they edit a test

## Out of scope
- A reviewer agent or per-test time limits (rejected: runs too late, flaky under load)
- Changing what the plugin does for users
