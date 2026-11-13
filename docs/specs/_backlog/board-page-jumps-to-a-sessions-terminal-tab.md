---
title: Board page jumps to a session's terminal tab
tags: [tools, spec-workflow]
created: 2026-11-13T13:41:24-08:00
---
From the live-board page design (phase 10), picked by Anton on 2026-11-13 as "jump to a session's tab (backlog
card)". Finding the right terminal tab among ten sessions is the real pain: a row on the page (a waiting
question, a silent session) should focus the iTerm tab of the session it belongs to, or start one. Not proven
possible yet: `launch` records the tab only when it opens one, and it takes a spec, not a card, so a card nothing
covers has no session to jump to. Needs a short spike first.
