import type { CardDoc } from "../cards/card-doc";
import type { SourceDoc } from "../cards/source-doc";
import type { TagDoc } from "../cards/tag-doc";
import type { PrDoc } from "../plan/docs/pr-doc";
import type { PhaseDoc, Task } from "../plan/docs/phase-doc";
import type { SpecDoc } from "../plan/docs/spec-doc";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import type { QuestionDoc } from "../questions/question-doc";
import { CLAUDE_CODE_SOURCE, type SessionDoc } from "../sessions/session-doc";

export function task(overrides: Partial<Task> = {}): Task {
  return { id: "1.1", text: "Do the thing", done: false, ...overrides };
}

export function phaseDoc(overrides: Partial<PhaseDoc> = {}): PhaseDoc {
  const id = overrides.id ?? "1";
  return {
    id,
    title: `Phase ${id}`,
    outcome: "Something ships.",
    file: `phases/phase-${id}.md`,
    needs: [],
    code: true,
    tasks: [task({ id: `${id}.1` })],
    ...overrides,
  };
}

export function specDoc(overrides: Partial<SpecDoc> = {}): SpecDoc {
  return {
    name: "checkout",
    planVersion: 1,
    phases: ["1"],
    joinedAt: "2026-11-11T20:00:00-08:00",
    joinedFrom: "b04412a8f14deab768d420d9dd09b78042b0d2fb",
    layout: 1,
    ...overrides,
  };
}

export function prDoc(overrides: Partial<PrDoc> = {}): PrDoc {
  const group = overrides.group ?? "A";
  return { group, branch: `feat/checkout-pr-${group.toLowerCase()}`, state: "not-opened", ...overrides };
}

export function questionDoc(overrides: Partial<QuestionDoc> = {}): QuestionDoc {
  return {
    id: "q1",
    about: "checkout#1",
    kind: "question",
    askedAt: "2026-11-13T09:00:00-08:00",
    askedBy: "session-1",
    question: "Reset the Teachers pick each morning?",
    ...overrides,
  };
}

export function cardDoc(overrides: Partial<CardDoc> = {}): CardDoc {
  return {
    id: "c96",
    title: "Featured row keeps events visible",
    status: "open",
    commitment: "asked",
    tags: [],
    coveredBy: [],
    createdAt: "2026-11-13T09:00:00-08:00",
    ...overrides,
  };
}

export function sourceDoc(overrides: Partial<SourceDoc> = {}): SourceDoc {
  return {
    card: "c96",
    role: "origin",
    app: "imessage",
    occurredAt: "2026-11-11T18:02:00-08:00",
    quote: "I like having the Upcoming Events, now it doesn't show",
    ref: "msg 4821",
    ...overrides,
  };
}

export function tagDoc(overrides: Partial<TagDoc> = {}): TagDoc {
  return { name: "Academy Ballroom", kind: "customer", ...overrides };
}

export function sessionDoc(overrides: Partial<SessionDoc> = {}): SessionDoc {
  return {
    ref: { source: CLAUDE_CODE_SOURCE, id: "s1" },
    who: "Anton",
    host: "mbp",
    tree: "checkout-pr-a",
    mode: "execute",
    lastWriteAt: "2026-11-13T09:00:00-08:00",
    ...overrides,
  };
}

// Spec `alpha` as joined: phase 2 holds 2.3–2.5 open, phase 3 holds 3.1.
export const ALPHA_PHASES: PhaseDoc[] = [
  phaseDoc({ id: "2", file: "phases/phase-2.md", tasks: [task({ id: "2.3", text: "three" }), task({ id: "2.4", text: "four" }), task({ id: "2.5", text: "five" })] }),
  phaseDoc({ id: "3", file: "phases/phase-3.md", needs: ["2"], tasks: [task({ id: "3.1", text: "one" }), task({ id: "3.2", text: "two" })] }),
];

// A spec as join leaves it on the record, by document path: one source for the real and the fake seed.
export function joinedDocs(spec: string, phases: readonly PhaseDoc[], overrides: Partial<SpecDoc> = {}): Record<string, SpecDoc | PhaseDoc> {
  return {
    [specDocPath(spec)]: specDoc({ name: spec, phases: phases.map((phase) => phase.id), ...overrides }),
    ...Object.fromEntries(phases.map((phase) => [phaseDocPath(spec, phase.id), phase])),
  };
}
