# In-flight state

**Session ended:** 2026-10-01
**Active phase:** 5a — Remote claims (done; 6 ready)

## Implicit context

- The installed plugin is still the 2.33.0 cache: its execute.md and handoff.md have no claim steps until 2.36.0
  ships. Run `claim take` and `release` by hand (repo `skills/spec/tools/spec.ts`) to dogfood.
- The full suite has one known flake, the stale-claim race test. It's a real offline-only race; see
  `gotcha-displace-put-back-can-drop-a-winner.md`.
