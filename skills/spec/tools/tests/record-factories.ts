import type { PhaseDoc, Task } from "../plan/docs/phase-doc";
import type { SpecDoc } from "../plan/docs/spec-doc";

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
