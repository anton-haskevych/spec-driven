---
from: design session in spec-driven, 2026-11-18 (three CRM transcripts Anton brought)
from-session: fb0f4bc8-fcf1-44c0-b5a4-da9af68cf4e0
created: 2026-11-18T03:31:02-08:00
---

# goal-paths — Seed

## Why it branched
Anton keeps fighting how specs relate in CRM: specs restate each other's work, and "how do we get to clean
data for Academy" had to be drawn by hand as a page. The relations exist but agents can't reason over them.

## In the user's words
> "For complex scopes and huge projects where everything is intertwined … we've got to be able to have
> spec-within-spec-within-spec or some sort of clear dependency graph or some sort of grouping of them … we
> have quite a few specs that re-iterate the same idea or purpose just with the different angle or scope of
> change" (Anton, 2026-11-18)

> "Yeah I liked that sort of view: https://claude.ai/artifact/L9UCfGWy3hnTFdvm1p2yAa. The most important
> thing though is to equip agent with the tooling and knowledge about how do specs relate, how do they fit
> into broader picture, what is our goal for creating specs that relate to specs and specs that wait on
> specs that wait on specs. So that agent could make business related decisions about what to prioritize or
> to explain to me or know for himself or planning about what phases should come next and what does it wait
> on" (Anton, 2026-11-18)

> "Oh my god this is really a mess of all these specs and their relationships to each other … create clear
> dependency graph explaining the chain of how do we finally get to having the clean good data for the
> studio" (Anton, in the CRM oversee session, 2026-11-18)

## Decided
- The agent is the first reader. The product is what a pack tells the agent (goal, path, state, next,
  waits-on, why); a page for Anton is a render of the same data · Anton
- The model for the view is the hand-made chain page (source in Evidence): a finish line, lanes by role,
  per-stop state, the order with reasons, and what is off the path and why · Anton
- No nested spec folders — chosen: goal anchored on what exists (tag → card → covering spec, plus `needs`),
  rejected: spec-within-spec (the work is a graph: `class-type-cleanup` is part of `migration-engine`, on
  Academy's path, and covers a promise to Chasity) · recommended; Anton answered with the view, not the fork
- An umbrella spec owns strategy and order, never a phase for work a child spec owns; it adds a `needs`
  edge and the view shows that phase inline · recommended, unconfirmed
- Grows as specs are touched, no backfill of CRM; nothing Anton types (fires inside prep, create, review,
  resume, execute, list, oversee) · standing rules

## Open for prep
- Where a goal's hand-written parts live. A walk over `needs` gives state, ready set and longest pole. It
  cannot give the finish line, each member's role (tool built once / this customer's data / keeps it clean,
  not blocking), the reason for an order, or the off-path list. A card can't hold those. Candidates: a goal
  file (`docs/specs/_goals/<name>.md`) or the umbrella spec's own files.
- What each pack prints so the agent can decide: "serves <goal>, as <role>; unblocks <x>; the goal's longest
  pole is <y>; due <date>". Whether a spec's rank on the board and in `list` inherits its goal's priority
  (a p3 tool spec that blocks a p0 goal).
- The knowledge half: a short SKILL.md section on how specs fit together and when new work is a new spec,
  a phase, an edge or a supersede.
- A "same card" check at prep/create/review: a new phase covering a card another open phase covers. Today's
  overlap check compares `code-map.md` files only, so data and task phases are invisible to it.
- Real order written as `related` prose: flag it when the spec is next touched.

## What the caller needs
Nothing waits on it. Academy's migration and `owner-funnel` in CRM are the first two users.

## Evidence
- `research/2026-11-18-wave-0-crm-relations.md` — counts across CRM's 445 specs, the three incidents, what
  the chain page holds that no tool computes
- `~/IdeaProjects/crm/docs/specs/academy-ballroom-migration/research/2026-11-18-clean-class-data-chain/chain.html`
  — the page Anton liked
- `skills/spec/SKILL.md` § Relations between specs; `skills/spec/tools/graph/` (446 lines, no transitive walk)
