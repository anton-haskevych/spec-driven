import { gitAt } from "../core/git";
import { phaseDocPath } from "../plan/kinds";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import { serializeDoc } from "../record/document";
import { gitRecordPort } from "../record/ref";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { ALPHA_PHASES, joinedDocs } from "./record-factories";
import { JOINED_STUB, joinedFiles, withSettings } from "./tree";

export { ALPHA_PHASES };
export const STUB = JOINED_STUB;

// Spec `alpha` on the board with the switch on, on a real origin.
export function joinedRepo(prefix: string, phases: readonly PhaseDoc[] = ALPHA_PHASES): TestRepo {
  const repo = repoWithOrigin(prefix);
  withSettings(repo);
  joinedFiles(repo, phases);
  repo.commitAll("alpha");
  repo.git("push", "-q", "origin", "main");
  const port = gitRecordPort(gitAt(repo.dir, isolatedRunner));
  if (!port) throw new Error("no origin");
  const docs = Object.entries(joinedDocs("alpha", phases)).map(([path, doc]) => ({ path, text: serializeDoc(doc) }));
  const commit = port.commit({ kind: "absent" }, docs, "record: join alpha");
  if (!commit.ok) throw new Error(commit.reason);
  port.push(commit.value, { kind: "absent" });
  return repo;
}

export function recordPhase(repo: TestRepo, phase: string): PhaseDoc {
  repo.git("fetch", "-q", "origin", "+refs/spec-board/record:refs/spec-board-remote/record");
  return JSON.parse(repo.git("show", `refs/spec-board-remote/record:${phaseDocPath("alpha", phase)}`)) as PhaseDoc;
}
