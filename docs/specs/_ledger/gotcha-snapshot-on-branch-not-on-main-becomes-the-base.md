---
kind: gotcha
paths: [skills/spec/tools/publish/**]
seen-in: [oversee-one-spec]
created: 2026-11-17T14:54:00-08:00
---

# A docs snapshot that is on the branch but not on main becomes the next publish's base

Never put a `docs(spec): snapshot` commit on a branch before it has landed on main. `snapshotBase` takes the newest
snapshot on HEAD as the base whenever that snapshot is not already contained in the merge-base with main, so the
next publish diffs from it and silently skips every spec-doc change made before it.

Evidence: `skills/spec/tools/publish/snapshot.ts` `snapshotBase` (`alreadyOnMain ? mergeBase : last`). The
oversee-one-spec review (2026-11-17) rejected "push lane + snapshot to the spec branch, then publish" for this
reason. Publish first (`publishDocs` merges the snapshot back only after main accepted it), then move the branch.
