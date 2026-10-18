---
kind: gotcha
applies-to: [phase 1+]
created: 2026-10-17T20:59:58-07:00
---

# A malformed or unmatchable owner silently means "shared"

`readFocusFields` drops an `owner:` that isn't a string (`[taras]`, `42`, `null`) and only records a
doctor problem, so `owner === undefined` and every crew would pick the spec. `personKey` keeps only
`[a-z0-9]` and `samePerson` needs 3 key characters, so a Cyrillic git name or `owner: tk` matches
no one, also silently.

Fix in this spec: `ownerOf` returns `INVALID_OWNER` for a malformed owner, which `isOffered` never
offers (shown `(owner?)`); `runnerName` and `spec.ts owner` refuse a name without a 3-char match key.
Any new code that decides who gets work must go through `ownerOf` + `isOffered`, never read
`meta.owner` directly.
