---
kind: gotcha
paths: [skills/spec/tools/core/git.ts]
created: 2026-10-17T21:03:54-07:00
seen-in: [owner-split]
---

# `git -c user.useConfigOnly=true var GIT_AUTHOR_IDENT` also fails when only the email is unset

Pass a placeholder email too (`-c user.email=spec-driven@invalid`) when you only want the configured
name: with `useConfigOnly`, git refuses (`fatal: no email was given and auto-detection is disabled`)
even when `user.name` is set, though plain commits work on that machine because git guesses the email.

Probed 2026-10-17 in a scratch repo with `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1`: no
config → fails (email message); name only → fails (email message); name + `-c user.email=x@x` →
`Taras K <x@x> …`; email only → fails (`no name was given`). Without the placeholder, an error that
says "set git user.name" would send a person whose name is already set looking in the wrong place.
