import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { gitAt } from "../core/git";
import { parseDoc } from "../record/document";
import { RECORD_REF } from "../record/layout";
import { gitRecordPort, type RecordPort } from "../record/ref";
import { writeRecord } from "../record/write";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const LIST = "specs/alpha/list.json";
const WRITERS = ["w1", "w2", "w3"];

describe("racing record writers (real git)", () => {
  let repo: TestRepo;
  let port: RecordPort;

  beforeAll(() => {
    repo = repoWithOrigin("spec-record-race-");
    for (const writer of WRITERS) repo.clone(writer);
    const made = gitRecordPort(gitAt(repo.dir, isolatedRunner));
    if (!made) throw new Error("no origin");
    port = made;
  });
  afterAll(() => repo.cleanup());

  const reset = async (doc: unknown) => {
    const written = await writeRecord(port, () => ({ ops: [{ op: "replace", path: LIST, doc }] }), { validate: () => [] });
    if (written.kind !== "landed") throw new Error(`reset ${written.kind}`);
    return written.versions[LIST] ?? "";
  };
  const onOrigin = () => parseDoc(repo.git("--git-dir", repo.origin, "show", `${RECORD_REF}:${LIST}`));

  test("three clones each add a different entry to one list, and all three land", async () => {
    await reset({ items: [] });
    const outcomes = await race(WRITERS.map((writer) => ["add", writer]));
    expect(outcomes).toEqual(["landed", "landed", "landed"]);
    expect((onOrigin() as { items: string[] }).items.toSorted()).toEqual(WRITERS);
  });

  test("three clones set the same value against one version, and exactly one lands", async () => {
    const version = await reset({ items: [] });
    const outcomes = await race(WRITERS.map(() => ["set", "same", version]));
    expect(outcomes.toSorted()).toEqual(["conflict", "conflict", "landed"]);
    expect(onOrigin()).toEqual({ items: [], value: "same" });
  });

  async function race(jobs: string[][]): Promise<string[]> {
    const startAt = Date.now() + 800;
    const runs = jobs.map(([mode = "", value = "", ifVersion], index) => {
      const argv = ["bun", join(import.meta.dir, "fixtures", "record-writer.ts"), join(repo.root, WRITERS[index] ?? ""), mode, value, String(startAt), ...(ifVersion ? [ifVersion] : [])];
      return Bun.spawn(argv, { stdout: "pipe", stderr: "pipe" });
    });
    return Promise.all(runs.map(async (run) => (await new Response(run.stdout).text()).trim() || (await new Response(run.stderr).text()).trim()));
  }
});
