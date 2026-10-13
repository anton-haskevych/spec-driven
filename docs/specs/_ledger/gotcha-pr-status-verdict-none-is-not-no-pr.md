---
kind: gotcha
paths: [skills/spec/tools/pr/**, skills/spec/execute.md, skills/spec/handoff.md]
created: 2026-10-12T20:16:15-07:00
seen-in: [oversee-crew-spec]
---

# `pr status` verdict `none` means a PR with no CI yet, not "no PR": ask `gh pr view` for existence

To decide whether a branch has an open, ready PR, use `gh pr view <branch> --json state,isDraft`, not the `pr status` verdict. `none` is the verdict for an open PR whose CI never ran or hasn't registered yet. A branch with no PR prints no verdict at all: it gives a `pr status:` resolve error (`T/pr/resolve.ts`). A failed `gh` call gives `unknown`.

Why it bites: a rule like "push unless the verdict is not none/draft/merged/closed" pushes on every commit to a ready PR whose CI is still registering, which restarts CI each time. It also defers pushes indefinitely while `gh` is rate-limited. `pr status` is also the heavy command, because it saves job logs and spends the gh budget. Found in oversee-crew-spec review 2026-10-12 (execute.md:175 lists the verdicts).
