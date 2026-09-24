# Phase shapes

Recurring phase shapes, taken from how real specs ended up being built. `create` offers them while splitting work into phases, and a phase names the one it follows in its frontmatter (`shape: <name>`). They are offers, not requirements; a phase that fits none is fine. A project can add its own in `docs/specs/_playbook/archetypes.md`.

Each shape lists when it fits, how its edges usually look (SKILL.md → *Phase edges*), and the traps that specs following it kept rediscovering.

## harness-first

**When:** the feature's correctness depends on something you can't easily provoke: an external API's failure modes, webhook redelivery, races, time.
**Shape:** phase 1 builds the tools that reproduce those failures (fault-injecting client, event replayer, race gate, clock control) with a self-test each. Later phases `needs: [1]` and prove themselves with it.
**Traps:** a harness whose tests never run in CI proves nothing, so wire it into CI in the same phase. Verify the external system's behaviour against its docs or a sandbox, not memory.

## telemetry-first

**When:** success will be judged by numbers, or later phases change a funnel.
**Shape:** ship the events and their contract first, so the baseline exists before behaviour changes. UI phases `needs:` the telemetry phase.
**Traps:** one producer per wire. Generate the event types from one schema instead of hand-copying them across languages. Check that metrics are allow-listed where the platform drops unknown names.

## guardrail-alone

**When:** a rule must become impossible to break: a lint or ArchUnit rule, a CI check, a required field, removing an escape hatch.
**Shape:** its own phase and its own `pr:` group, landing after the code it enforces is already compliant (`needs:` those phases). Often the graduation of a project lesson (SKILL.md → *Graduation*); set the lesson's `enforced-by:` when it lands.
**Traps:** riding a feature PR hides the enforcement diff inside feature noise. A rename belongs in its own PR for the same reason.

## expand-bake-contract

**When:** a schema, enum or API shape changes while old and new code run side by side (blue/green, separately deployed frontend and backend, rollbacks).
**Shape:** expand (add the new column, value or field, with old code still correct) → `needs-deployed` → switch writers and readers → `needs-deployed` → contract (drop the old). Three phases, two deploy waits.
**Traps:** a new enum value or a rename breaks the old fleet that's still serving traffic. Migration version numbers collide across open PRs. Never edit an applied migration.

## dark-launch-to-retire

**When:** a user-facing capability rolls out gradually.
**Shape:** build behind a flag → pilot (named tenants) → open to everyone → retire the flag. Plan the retire phase at birth, so the flag has an end date in the spec.
**Traps:** flags outlive their rollout when no phase owns their removal. Keep the enable switch operator-owned until the pilot proves it.

## cutover-and-runbook

**When:** traffic moves from an old path to a new one (a new stack, a new pipeline, a replaced integration).
**Shape:** build the new path dark → cut over (`needs-deployed` on the build) → replay/backfill plus a runbook phase that writes the operational docs.
**Traps:** deploy order between separately deployed parts; an unsynthesised or stale infrastructure template; resource limits in a shared stack.

## design-lock

**When:** UI work follows an approved visual design.
**Shape:** a folder-shape phase that stores the approved snapshot and the vocabulary it uses, before the UI phases (`needs:` it).
**Traps:** snapshot wording drifts from the domain's words, so declare overrides in the phase instead of in reviewers' heads. Verify rendered output at the widths that matter, and keep the evidence in the spec, not in `/tmp`.
