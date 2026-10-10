---
kind: decision
applies-to: [phase 3]
created: 2026-10-10T13:47:09-07:00
---

# In-flight notes: one file per phase, not sections

`in-flight/phase-<id>.md` (`in-flight/pr-<group>.md` for a session with no phase). Handoff writes only its own file and deletes it at a clean boundary. The execute pack reads only the picked phase's file. A legacy `in-flight.md` stays readable.

Rejected: `## Phase <id>` sections in one file (the first draft). A scratch-repo merge of two branches that each appended a section hit CONFLICT; two new files merged clean. Sections also let other phases' notes push the picked phase's past the pack's 2,000-char clip, and clash with the handoff template's own `##` headings.

The doctor keeps today's rule: warn on pending in-flight only when every phase is done, so a deploy note on a ticked phase isn't flagged.
