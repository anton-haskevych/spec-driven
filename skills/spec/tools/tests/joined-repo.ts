import { gitAt } from "../core/git";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import { serializeDoc } from "../record/document";
import { gitRecordPort } from "../record/ref";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { phaseDoc, specDoc, task } from "./record-factories";

export const STUB = "> On the board since 2026-11-11. This list is frozen; the board is the source.\n";

// Spec `alpha` on the board with the switch on: phase 2 holds 2.3–2.5 open, phase 3 holds 3.1.
export const ALPHA_PHASES: PhaseDoc[] = [
  phaseDoc({ id: "2", file: "phases/phase-2.md", tasks: [task({ id: "2.3", text: "three" }), task({ id: "2.4", text: "four" }), task({ id: "2.5", text: "five" })] }),
  phaseDoc({ id: "3", file: "phases/phase-3.md", needs: ["2"], tasks: [task({ id: "3.1", text: "one" }), task({ id: "3.2", text: "two" })] }),
];

export function joinedRepo(prefix: string, phases: readonly PhaseDoc[] = ALPHA_PHASES): TestRepo {
  const repo = repoWithOrigin(prefix);
  repo.write("docs/specs/_playbook/settings.md", "---\ndocs: main\nboard:\n  record: on\n---\n");
  repo.write("docs/specs/alpha/CLAUDE.md", "---\nstatus: active\n---\n# Alpha\n");
  repo.write("docs/specs/alpha/progress.md", STUB);
  repo.write("docs/specs/alpha/ledger/INDEX.md", "# Ledger\n");
  for (const phase of phases) repo.write(`docs/specs/alpha/${phase.file}`, `# Phase ${phase.id}\n\n**Goal:** ${phase.id}.\n`);
  repo.commitAll("alpha");
  repo.git("push", "-q", "origin", "main");
  const port = gitRecordPort(gitAt(repo.dir, isolatedRunner));
  if (!port) throw new Error("no origin");
  const docs = [
    { path: specDocPath("alpha"), text: serializeDoc(specDoc({ name: "alpha", phases: phases.map((phase) => phase.id) })) },
    ...phases.map((phase) => ({ path: phaseDocPath("alpha", phase.id), text: serializeDoc(phase) })),
  ];
  const commit = port.commit({ kind: "absent" }, docs, "record: join alpha");
  if (!commit.ok) throw new Error(commit.reason);
  port.push(commit.value, { kind: "absent" });
  return repo;
}

export function recordPhase(repo: TestRepo, phase: string): PhaseDoc {
  repo.git("fetch", "-q", "origin", "+refs/spec-board/record:refs/spec-board-remote/record");
  return JSON.parse(repo.git("show", `refs/spec-board-remote/record:${phaseDocPath("alpha", phase)}`)) as PhaseDoc;
}
