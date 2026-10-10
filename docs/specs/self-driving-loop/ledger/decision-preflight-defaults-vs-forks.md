---
kind: decision
applies-to: [phase 1, 2]
created: 2026-10-10T13:47:09-07:00
---

# Preflight splits defaults from forks; execute stops only on forks

phase-preflight's *Decisions for you* becomes *Defaults applied* (a recommendation, in scope, reversible) and *Forks for you* (changes the phase Goal or Outcome, deletes or migrates data, changes an external contract, or moves scope between specs). Execute applies the first, lists them under `Say if wrong:`, and stops on the second.

Rejected: "apply the recommended option; stop only when there is none". Preflight's contract gives every decision a recommendation (phase-preflight/SKILL.md:137-140), so that rule would apply every real fork in a tab nobody is watching.
