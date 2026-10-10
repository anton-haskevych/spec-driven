---
kind: decision
applies-to: [general]
created: 2026-10-10T13:47:09-07:00
---

# Release version is picked at merge time

Each PR takes main's minor + 1 when it merges and appends its ROADMAP row. No spec hardcodes a number.

Why: pr-babysit's phase 7, pr-opening and technical.md hardcode 2.42.0, while this spec's two smaller PRs will likely merge first. A fixed number either collides or makes the version go backwards, and marketplace installs then never update. pr-babysit's side is flagged to its session, not edited here (it holds a live claim).
