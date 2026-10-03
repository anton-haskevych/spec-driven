---
date: 2026-10-02
phase: 9
chunk: launch-focus
---

# Phase 9 preflight — launch keeps your place

*Source of record — do not edit.* Self-scaled: one script builder, one report line.

## Findings that change the plan

1. **Terminal.app steals focus too** (`terminal.ts:21`, `activate`). The phase named only iTerm and tmux.
   Drop `activate` and put the window that was in front back in front.
2. **Two launches from two sessions at the same instant can still restore focus to the other launch's new
   tab.** Each script remembers "the tab in front", and between two Apple events that can be the tab the other
   script just made. The command never lands in the wrong tab any more (each writes into the session it
   created), which was the real harm on 2026-10-02. Accepted: one launcher process launches its rows in
   sequence; a cross-process lock isn't worth its cost.
3. **The tab number comes back on stdout** (`launchReport`, `commands/launch.ts:34-35` ignores it). Parse an
   integer; anything else keeps today's line. `⌘<n>` only for n ≤ 9.

## Canon

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Functions do one thing | Bites | Script builders stay pure strings; `launchReport` only formats |
| Boundaries | Bites | AppleScript output is untrusted text: parse, fall back |
| Tests | Bites | Unit tests pin the script's order (tab held, written, then the old tab selected); one manual iTerm run |
| Clean Architecture, SOLID, DDD | Inert | |

## Amendments

1. Deliverable 1 also covers Terminal.app: no `activate`, front window restored.
2. Report `Launched: iTerm tab <n> (⌘<n>) — <title>`.

## Decisions for you

None.
