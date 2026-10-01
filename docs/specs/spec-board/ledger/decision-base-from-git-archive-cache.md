---
kind: decision
applies-to: [phase 1+]
created: 2026-10-01T14:01:46-07:00
---

# The base is a `git archive` cache read by the unchanged disk loaders

`origin/<default>`'s spec docs are archived once per sha into `<git-common-dir>/spec-board/base/<sha>/`
and loaded with `loadNodes` / `loadSpecState` / `loadBacklog` / `loadSettings`, unchanged. The archive
covers only the read set: `*/*.md` and `*/phases/**/*.md` under each spec root. It never pulls whole
roots.

Rejected: an `ls-tree` + `cat-file --batch` blob reader. It needed a parallel `…From` loader family and
a byte-framed parser, and `Runner` hands back decoded text. Its virtual `SpecFolder.dir` made every
`spec.dir` disk reader (`pr/resolve.ts`, `portfolio/rows.ts`) quietly read the cwd, which is the bug this
spec fixes. The 501 MB argument against archiving was about whole roots. The read set costs 0.22 s + 0.6 s
to extract (wave 1), and nothing when the sha is already cached. The plan session approved the archive
(wave 0).

Source: `reviews/2026-10-01-pre-build-collegium.md` B1–B3.
