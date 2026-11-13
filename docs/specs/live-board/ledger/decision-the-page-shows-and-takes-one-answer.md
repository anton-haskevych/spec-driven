---
kind: decision
applies-to: [phase 10+]
created: 2026-11-13T13:41:24-08:00
---

# The page shows the board and takes one kind of input: an answer

Anton, 2026-11-13: "No-one in CRM Dance is using manual development, no one is going to add or update those cards
manually … Human board is just a fast visual way for us to understand what is going on. It needs to be
adhd-friendly and visual."

- **No edit on the page except answering a waiting question** (`answerPlan` with the shown version). Priority, due
  date, tags and assignee were in the first design and are cut: don't add a form, an Edit button or a write route
  for them, here or when Academy's board moves over (phase 11). The Academy page's forms are not carried over.
- **Two screens and a card:** Now (needs you, sessions, moving), Plan (a row per tag by priority, folded, with
  panels per covering spec, Open, Done), an opened card at `/#c<id>`. The look is the saved mock,
  `research/phase-10/2026-11-13-page-design-mock.html`, which Anton approved as is ("I love the font the views
  the styles, everything is perfect"): build to it, don't redesign it.
- **Colour has one meaning each** (status family, red for trouble, yellow for "waits on you", a hue per person,
  priority by weight). An earlier pass with colour only on things needing action was rejected as "too tight and
  too monotone".
- **The page renders what the tools compute:** `spec.ts page --json` prints the same model, the HTML is built on
  the server, and no board rule lives in page script.
- **A dead feed must look dead:** a tick every cycle, and the page greys out after 15 s without one.

Full reasoning and the council: `research/phase-10/2026-11-13-page-council-and-design.md`.
