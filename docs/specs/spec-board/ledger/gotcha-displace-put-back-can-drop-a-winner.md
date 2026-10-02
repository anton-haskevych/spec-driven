---
kind: gotcha
applies-to: [phase 5a, 6]
created: 2026-10-01T17:08:51-07:00
---

# A local stale-claim race can end with two winners when there is no origin

`displaceIfUnchanged` (`claims/atomic-file.ts`) renames the claim away, compares it, and links it back when it
changed. If a third taker creates the file between the rename and the link-back, the link fails with EEXIST
(swallowed), and the first winner's claim is deleted. Both the first winner (`took-over`) and the third
(`taken`) report success.

- Symptom: `claims-store.test.ts` → "four takers on a stale claim" fails about 1 in 10 full-suite runs (load
  widens the window) and never in isolation. Last seen 2026-10-01, twice.
- Since 5a, a repo with an origin is covered: both winners push, the create-only/lease push refuses one, and
  it rolls back its local claim. Only offline and no-origin takes keep the hole.
- Fix when it matters: serialize displacement behind a per-claim lock dir (`mkdir` is atomic), or never put
  back (treat "changed under me" as held and leave the moved file for the sweep). Raising the test's start
  delay hides it; it doesn't fix it.

**Fixed 2026-10-02 (phase 7).** By then it failed about 1 run in 6 even in isolation. `removeIfUnchanged`
replaces `displaceIfUnchanged`: it takes `<claim>.json.lock` with `mkdir`, re-reads the file and removes it
only if it still holds the judged text. Nothing is moved, so nothing is put back. A create never replaces a
file, so under the lock the text can't change before the removal. `sweepLeftovers` (every take and release)
clears a lock older than a minute, which only a crash mid-removal leaves. Race test: 25/25 in isolation,
full suite green twice.
