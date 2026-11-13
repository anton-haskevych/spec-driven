import { specStateFrom } from "../core/spec-state";
import type { JoinCopy } from "../plan/join";

export const SPEC = "schedule-clarity-fixes";

export interface PhaseSpec {
  id: string;
  done?: boolean;
  deployed?: string;
  edges?: string;
  tasks: readonly (string | [string, true])[];
}

export function phaseFile(phase: PhaseSpec): string {
  const frontmatter = phase.edges === undefined ? "" : `---\n${phase.edges}\n---\n\n`;
  const tasks = phase.tasks.map((task) => (typeof task === "string" ? `- [ ] ${task}` : `- [x] ${task[0]}`));
  return `${frontmatter}# Phase ${phase.id} — P${phase.id}\n\n**Outcome:** phase ${phase.id} ships. More detail.\n\n## Deliverables\n\n${tasks.join("\n")}\n`;
}

export function pointer(id: string): string {
  return `phases/phase-${id}.md`;
}

export function specFiles(phases: readonly PhaseSpec[]): Map<string, string> {
  const lines = phases.map((phase) => `- [${phase.done ? "x" : " "}] Phase ${phase.id} — P${phase.id} → \`${pointer(phase.id)}\`${phase.deployed ? ` · deployed ${phase.deployed}` : ""}`);
  return new Map([["progress.md", `# Progress\n\n## Phases\n${lines.join("\n")}\n`], ...phases.map((phase) => [pointer(phase.id), phaseFile(phase)] as const)]);
}

export function copyOf(tree: string, head: string, files: ReadonlyMap<string, string>): JoinCopy {
  return { tree, head, state: specStateFrom({ name: SPEC, dir: `/trees/${tree}/docs/specs/${SPEC}` }, (path) => files.get(path)) };
}

// The Nov 11 incident: phase 2 done only in tree pr-a; phases 6a and 10 only on main, added by a review.
export function november11(): { base: JoinCopy; trees: JoinCopy[] } {
  const plain = (id: string, done = false): PhaseSpec => ({ id, done, tasks: done ? [[`${id} one`, true], [`${id} two`, true]] : [`${id} one`, `${id} two`] });
  const main = ["1", "2", "3", "4", "5", "6", "6a", "7", "8", "9", "10"].map((id) => plain(id, id === "1"));
  const treePhases = (overrides: Record<string, PhaseSpec>) => main.filter((phase) => phase.id !== "6a" && phase.id !== "10").map((phase) => overrides[phase.id] ?? phase);
  return {
    base: copyOf("main", "b".repeat(40), specFiles(main)),
    trees: [
      copyOf("pr-a", "0651e4e".padEnd(40, "0"), specFiles(treePhases({ "2": plain("2", true) }))),
      copyOf("pr-b", "c".repeat(40), specFiles(treePhases({ "3": { id: "3", tasks: [["3 one — `9f1c2d3`", true], "3 two"] } }))),
    ],
  };
}
