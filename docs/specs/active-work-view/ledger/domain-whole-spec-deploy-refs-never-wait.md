---
kind: domain
applies-to: [phase 3, 5]
created: 2026-10-07T19:32:21-07:00
---

# A whole-spec `needs-deployed` ref never waits on a deploy

`deployWaits` (`board/deploy-waits.ts`) only ever yields phase targets (`spec#id`). A whole-spec ref
(`needs-deployed: [gift-cards]`) resolves through `wholeSpecMark` in `ready/refs.ts`, which sets
`deployed = done = isFinished(node)`: finishing the spec counts as deployed, so it never shows as
"needs deploy of …". It waits as an ordinary blocked reason until the spec finishes.

For the FOCUS lane's `deploy` kind: group `deployWaits` by `splitKey(waiter).spec` and list the target
ids; there is no bare-spec target to special-case. `splitKey` still returns `{ spec }` for a bare key
(it is `rowKey`'s inverse), so other callers stay safe.
