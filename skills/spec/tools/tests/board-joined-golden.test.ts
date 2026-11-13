import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boardCommand, type BoardDeps } from "../commands/board";
import { listCommand } from "../commands/list";
import { gitAt } from "../core/git";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { serializeDoc } from "../record/document";
import { gitRecordPort } from "../record/ref";
import { NOW } from "./board-factories";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { phaseDoc, specDoc, task } from "./record-factories";

const STUB = "> On the board since 2026-11-11. This list is frozen; the board is the source.\n";

interface LaneRow { spec: string; phase?: string; workspace?: string; reasons?: string[] }

describe("the board with a joined spec beside a file spec (real git)", () => {
  let repo: TestRepo;
  const claudeHome = mkdtempSync(join(tmpdir(), "spec-board-joined-claude-"));
  mkdirSync(join(claudeHome, "sessions"));
  const deps: BoardDeps = { runner: isolatedRunner, asyncRunner: isolatedAsyncRunner, claudeHome, now: NOW, env: {} };
  let joinedTree: string;
  let filesTree: string;

  beforeAll(() => {
    repo = repoWithOrigin("spec-board-joined-");
    repo.write("docs/specs/files/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.write("docs/specs/files/progress.md", "- [ ] Phase 1 — Draft → `phases/phase-1.md`\n- [ ] Phase 2 — Send → `phases/phase-2.md`\n");
    repo.write("docs/specs/files/phases/phase-1.md", "---\nneeds: []\n---\n- [ ] draft\n- [ ] polish\n");
    repo.write("docs/specs/files/phases/phase-2.md", "---\nneeds: [1]\n---\n- [ ] send\n");
    repo.write("docs/specs/joined/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.write("docs/specs/joined/progress.md", STUB);
    for (const id of ["1", "2", "3"]) repo.write(`docs/specs/joined/phases/phase-${id}.md`, `# Phase ${id}\n\n## Deliverables\n\n- [ ] frozen ${id}\n`);
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");

    const filesWork = repo.addWorktree("files-tree", "feat/files");
    filesWork.write("docs/specs/files/phases/phase-1.md", "---\nneeds: []\n---\n- [x] draft\n- [ ] polish\n");
    filesWork.commitAll("files: draft");
    filesTree = realpathSync(filesWork.dir);
    const joinedWork = repo.addWorktree("joined-tree", "feat/joined-pr-a");
    joinedWork.write("docs/specs/joined/phases/phase-3.md", "# Phase 3\n\n## Deliverables\n\n- [x] frozen 3\n");
    joinedWork.commitAll("joined: a hand tick the board must ignore");
    joinedTree = realpathSync(joinedWork.dir);

    const port = gitRecordPort(gitAt(repo.dir, isolatedRunner));
    if (!port) throw new Error("no origin");
    const sha = repo.git("rev-parse", "HEAD");
    const docs = {
      [specDocPath("joined")]: specDoc({ name: "joined", phases: ["1", "2", "3"] }),
      [phaseDocPath("joined", "1")]: phaseDoc({ id: "1", title: "Model", tasks: [task({ id: "1.1", text: "model", done: true, evidence: sha })] }),
      [phaseDocPath("joined", "2")]: phaseDoc({ id: "2", title: "Wire", needs: ["1"], tasks: [task({ id: "2.1", text: "wire", done: true, evidence: `${sha} on origin/feat/joined-pr-a` }), task({ id: "2.2", text: "test" })] }),
      [phaseDocPath("joined", "3")]: phaseDoc({ id: "3", title: "Ship", needs: ["2"], tasks: [task({ id: "3.1", text: "frozen 3" })] }),
    };
    const commit = port.commit({ kind: "absent" }, Object.entries(docs).map(([path, doc]) => ({ path, text: serializeDoc(doc) })), "record: join joined");
    if (!commit.ok) throw new Error(commit.reason);
    port.push(commit.value, { kind: "absent" });
  });

  afterAll(() => {
    repo.cleanup();
    rmSync(claudeHome, { recursive: true, force: true });
  });

  test("lanes read the joined spec from the record and ignore its trees' frozen boxes", async () => {
    const { board } = JSON.parse(await boardCommand(repo.dir, ["--json", "--local"], deps));
    const rows = (lane: string) => (board.lanes[lane] as LaneRow[]).map(({ spec, phase, workspace, reasons }) => ({ spec, phase, ...(workspace ? { workspace } : {}), ...(reasons ? { reasons } : {}) }));
    expect({ flight: rows("inFlight"), ready: rows("ready"), blocked: rows("blocked") }).toEqual({
      flight: [
        { spec: "files", phase: "1", workspace: filesTree },
        { spec: "joined", phase: "2", workspace: joinedTree },
      ],
      ready: [],
      blocked: [
        { spec: "files", phase: "2", reasons: ["needs 1"] },
        { spec: "joined", phase: "3", reasons: ["needs 2"] },
      ],
    });
  });

  test("the list table counts the joined spec's phases from the record", async () => {
    const { specs } = JSON.parse(await listCommand(repo.dir, ["table", "--json"], deps));
    const progress = Object.fromEntries(specs.map((row: { name: string; progress: unknown }) => [row.name, row.progress]));
    expect(progress).toEqual({ files: { done: 0, total: 2 }, joined: { done: 1, total: 3 } });
  });
});
