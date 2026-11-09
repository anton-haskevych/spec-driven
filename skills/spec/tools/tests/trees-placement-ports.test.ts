import { expect, test } from "bun:test";
import { placeTree, type PlacementDeps, type PlaceWorld } from "../trees/place";
import { phaseEdges, phaseState, liveSession } from "./factories";

const world: PlaceWorld = {
  defaultBranch: "main", ownSessionId: "me",
  worktrees: [{ path: "/never-read", branch: "feat/one-pr-a", head: "abc", detached: false, locked: false, prunable: false, isMain: false }],
  claims: [], sessions: { ok: true, value: [liveSession({ sessionId: "other", cwd: "/never-read", status: "idle" })] },
  activity: new Map(),
  views: [{ spec: { name: "one", dir: "/missing" }, hasProgress: true, phases: [phaseState({ edges: phaseEdges({ pr: "A" }) })] }],
};

test("placement awaits one world and uses only the injected dirty check", async () => {
  let reads = 0;
  const dirty: string[] = [];
  const deps: PlacementDeps = {
    async loadWorld(spec) { expect(spec).toBe("one"); reads++; return { ok: true, value: world }; },
    addTree: async () => { throw new Error("existing tree must not be added"); },
    hasUncommittedChanges(path) { dirty.push(path); return true; },
  };
  expect(await placeTree({ spec: "one", phase: "1" }, deps)).toEqual({ ok: true, value: {
    kind: "busy", branch: "feat/one-pr-a", path: "/never-read", holder: "session other left uncommitted changes there",
  } });
  expect(reads).toBe(1);
  expect(dirty).toEqual(["/never-read"]);
});

test("world failure and existing-only requests never add a tree", async () => {
  const deps: PlacementDeps = {
    loadWorld: async () => ({ ok: false, reason: "cannot read placement inputs" }),
    addTree: async () => { throw new Error("must not add"); },
    hasUncommittedChanges: () => { throw new Error("must not inspect dirt"); },
  };
  expect(await placeTree({ spec: "one", phase: "1" }, deps)).toEqual({ ok: false, reason: "cannot read placement inputs" });
  deps.loadWorld = async () => ({ ok: true, value: { ...world, worktrees: [] } });
  expect(await placeTree({ spec: "one", phase: "1", existingOnly: true }, deps)).toEqual({ ok: false, reason: "no tree for feat/one-pr-a" });
});

test("ownership refusal precedes the add port and permitted addition receives the loaded world", async () => {
  let additions = 0;
  const absent = { ...world, owner: "taras", worktrees: [] };
  const deps: PlacementDeps = {
    loadWorld: async () => ({ ok: true, value: absent }),
    addTree: async (name, loaded) => {
      expect(loaded).toBe(absent);
      expect(name.branch).toBe("feat/one-pr-a");
      additions++;
      return { ok: false, reason: "fixture addition result" };
    },
    hasUncommittedChanges: () => false,
  };
  expect(await placeTree({ spec: "one", phase: "1", onlyFor: "anton" }, deps)).toEqual({ ok: false, reason: "one is taras's; this crew is anton's. Open it in your own session instead" });
  expect(additions).toBe(0);
  expect(await placeTree({ spec: "one", phase: "1" }, deps)).toEqual({ ok: false, reason: "fixture addition result" });
  expect(additions).toBe(1);
});
