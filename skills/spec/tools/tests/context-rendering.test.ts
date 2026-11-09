import { expect, test } from "bun:test";
import { loadPackReferences } from "../context/references";
import { executePack, type PackInput } from "../context/packs";
import { selectExecutePhase } from "../context/select-phase";
import { phaseState } from "./factories";
import { parseLesson } from "../lessons/project-ledger";

const phase = phaseState({ id: "2", entry: "- [ ] edit `src/one.ts`" });
const input: PackInput = {
  state: { spec: { name: "one", dir: "/nonexistent/never-read" }, hasProgress: true, phases: [phase] },
  doctor: "doctor: clean", lessons: [], relations: "none", ready: { ready: [phase], waiting: [], edgesDeclared: false },
  held: new Map(), playbooks: [],
};

test("loaded references render without consulting the spec directory", () => {
  const texts = new Map([
    ["ledger/INDEX.md", "- `gotcha-one.md` — [phase 2] — preserve identity"],
    ["code-map.md", "| `src/one.ts` | entry |"],
    ["CLAUDE.md", "# Loaded instructions"],
    ["design.md", "a".repeat(2048)],
  ]);
  const reads: string[] = [];
  const references = loadPackReferences((path) => { reads.push(path); return texts.get(path); });
  texts.clear();
  const rendered = executePack(input, phase, "chosen", references);
  expect(rendered).toContain("preserve identity");
  expect(rendered).toContain("# Loaded instructions");
  expect(rendered).toContain("- design.md (2 KB)");
  expect(rendered).not.toContain("- technical.md");
  expect(executePack(input, phase, "chosen", references)).toBe(rendered);
  expect(reads).toEqual(["ledger/INDEX.md", "code-map.md", "CLAUDE.md", "design.md", "technical.md"]);
});

test("missing references retain their existing messages", () => {
  const rendered = executePack(input, phase, "chosen", loadPackReferences(() => undefined));
  expect(rendered).toContain("(no ledger/INDEX.md)");
  expect(rendered).toContain("(no code-map.md)");
  expect(rendered).toContain("### CLAUDE.md\n(missing)");
  expect(rendered).toContain("### Read now (not inlined)\n(none)");
});

test("phase selection preserves held-phase skipping and explicit hints without I/O", () => {
  const next = phaseState({ id: "3" });
  const selection = { ...input, ready: { ready: [phase, next], waiting: [], edgesDeclared: false }, held: new Map([["one#2", "other"]]) };
  expect(selectExecutePhase(selection)).toEqual({ ok: true, value: { phase: next, note: "first ready phase; skipped 2 (in flight: other)" } });
  expect(selectExecutePhase(selection, "phase2")).toEqual({ ok: true, value: { phase, note: 'from your hint "phase2"' } });
  expect(selectExecutePhase({ ...input, held: selection.held })).toEqual({ ok: false, reason: "Every ready phase is in flight in another session: 2 (in flight: other). Tell the user and stop." });
});

test("pilot lesson advice requires explicit entry recall and preserves Claude hook advice", () => {
  const lesson = parseLesson("/lesson.md", "lesson.md", "---\nkind: gotcha\npaths: [src/**]\n---\n# Remember this\n");
  if (!lesson) throw new Error("lesson fixture invalid");
  const references = loadPackReferences(() => undefined);
  const withLesson = { ...input, lessons: [lesson] };
  expect(executePack(withLesson, phase, "chosen", references)).toContain("the edit hook shows its rule");
  for (const lessons of [[lesson], Array.from({ length: 50 }, (_, i) => ({ ...lesson, name: `lesson-${i}.md`, title: "Remember this ".repeat(20) }))]) {
    const local = executePack({ ...withLesson, lessons, workflow: { kind: "local-pilot", spec: "one", phase: "2" } }, phase, "chosen", references);
    expect(local).toContain("run `lessons recall <file…>` through the verified entry before edits");
    expect(local).not.toContain("the edit hook");
    expect(local).not.toContain("spec.ts lessons recall");
  }
});
