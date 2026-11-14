import { afterEach, describe, expect, test } from "bun:test";
import type { Runner } from "../core/run";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { readLocalPlans, readPlansAt } from "../plan/read-plans";
import { fakeRecord, fakeRecordReadPort, seedRecord } from "./fake-record";
import { phaseDoc, specDoc } from "./record-factories";
import { stubRunner } from "./stub-runner";
import { createTree, type Tree } from "./tree";

const NOW = new Date("2026-11-13T12:00:00Z");
const NO_GIT: Runner = {
  run(argv) {
    throw new Error(`no git expected, got: ${argv.join(" ")}`);
  },
};

let tree: Tree;
afterEach(() => tree.cleanup());

function boardOn(): string {
  tree = createTree("read-plans-");
  tree.write("docs/specs/_playbook/settings.md", "---\ndocs: main\nboard:\n  record: on\n---\n");
  return tree.root;
}

function joinedAlpha() {
  const record = fakeRecord();
  seedRecord(record, { [specDocPath("alpha")]: specDoc({ name: "alpha", phases: ["1"] }), [phaseDocPath("alpha", "1")]: phaseDoc({ id: "1" }) });
  return { recordPorts: () => ({ port: record, read: fakeRecordReadPort(record) }) };
}

describe("plan reads through the command's seams", () => {
  test("a one-spec command reads the joined plan from the injected record", () => {
    const plans = readPlansAt(boardOn(), { runner: stubRunner([]), seams: joinedAlpha() }, NOW);
    expect(plans.record.kind).toBe("read");
    expect(plans.isJoined("alpha")).toBe(true);
  });

  test("a hook's local read sees the same record without fetching", () => {
    const seams = joinedAlpha();
    readPlansAt(boardOn(), { runner: stubRunner([]), seams }, NOW);
    expect(readLocalPlans(tree.root, { runner: stubRunner([]), seams }, NOW).isJoined("alpha")).toBe(true);
  });

  test("seams with no record port read the files only and never ask git", () => {
    const plans = readPlansAt(boardOn(), { runner: NO_GIT, seams: { recordPorts: () => undefined } }, NOW);
    expect(plans.record.kind).toBe("none");
    expect(plans.isJoined("alpha")).toBe(false);
  });
});
