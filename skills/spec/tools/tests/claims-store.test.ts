import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { gitAt } from "../core/git";
import { claimFile, claimsDir, loadClaims, pruneClaims, releaseClaims, takeClaim, type Claim } from "../claims/store";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { createTree, type Tree } from "./tree";

function claim(fields: Partial<Claim> = {}): Claim {
  return { spec: "alpha", phase: "4", sessionId: "s1", workspace: "/work/crm", claimedAt: "2026-10-01T20:00:00.000Z", ...fields };
}

const never = () => false;
const always = () => true;

let tree: Tree;
afterEach(() => tree?.cleanup());

describe("claimsDir", () => {
  let repo: TestRepo;
  beforeAll(() => (repo = repoWithOrigin("spec-claims-dir-")));
  afterAll(() => repo.cleanup());

  test("every worktree of a clone shares one absolute claims folder", () => {
    const worktree = repo.addWorktree("wt", "feat/x");
    const fromMain = claimsDir(gitAt(repo.dir, isolatedRunner));
    const fromWorktree = claimsDir(gitAt(worktree.dir, isolatedRunner));
    expect(fromMain).toEqual({ ok: true, value: join(realpathSync(repo.dir), ".git", "spec-board", "claims") });
    expect(fromWorktree).toEqual(fromMain);
  });
});

describe("takeClaim", () => {
  test("takes a free phase and stores the claim", () => {
    tree = createTree("spec-claims-");
    expect(takeClaim(tree.root, claim(), never)).toEqual({ kind: "taken" });
    expect(loadClaims(tree.root)).toEqual({ claims: [claim()], unreadable: [] });
  });

  test("taking your own claim again is a no-op", () => {
    tree = createTree("spec-claims-");
    takeClaim(tree.root, claim(), never);
    expect(takeClaim(tree.root, claim({ claimedAt: "later" }), never)).toEqual({ kind: "already-yours" });
    expect(loadClaims(tree.root).claims).toEqual([claim()]);
  });

  test("a claim that is not stale holds the phase", () => {
    tree = createTree("spec-claims-");
    takeClaim(tree.root, claim(), never);
    expect(takeClaim(tree.root, claim({ sessionId: "s2" }), never)).toEqual({ kind: "held", by: claim() });
  });

  test("a stale claim is taken over and the old holder reported", () => {
    tree = createTree("spec-claims-");
    takeClaim(tree.root, claim(), never);
    expect(takeClaim(tree.root, claim({ sessionId: "s2" }), always)).toEqual({ kind: "took-over", from: claim() });
    expect(loadClaims(tree.root).claims).toEqual([claim({ sessionId: "s2" })]);
    expect(readdirSync(tree.root)).toEqual(["alpha#4.json"]);
  });

  test("an unparseable claim counts as live, even when everything looks stale", () => {
    tree = createTree("spec-claims-");
    tree.write("alpha#4.json", "{ half");
    expect(takeClaim(tree.root, claim(), always)).toEqual({ kind: "held", by: "unreadable" });
  });

  test("creates the claims folder on first use", () => {
    tree = createTree("spec-claims-");
    const dir = join(tree.root, "spec-board", "claims");
    expect(takeClaim(dir, claim(), never)).toEqual({ kind: "taken" });
    expect(readdirSync(dir)).toEqual(["alpha#4.json"]);
  });
});

describe("releaseClaims", () => {
  test("removes only the caller's claims for the spec, or for one phase", () => {
    tree = createTree("spec-claims-");
    for (const held of [claim(), claim({ phase: "5" }), claim({ spec: "beta" }), claim({ phase: "6", sessionId: "s2" })]) takeClaim(tree.root, held, never);
    expect(releaseClaims(tree.root, "s1", "alpha", "5")).toEqual([claim({ phase: "5" })]);
    expect(releaseClaims(tree.root, "s1", "alpha")).toEqual([claim()]);
    expect(loadClaims(tree.root).claims.map((held) => `${held.spec}#${held.phase}`).sort()).toEqual(["alpha#6", "beta#4"]);
  });
});

describe("pruneClaims", () => {
  test("removes the claims the predicate marks and keeps the rest", () => {
    tree = createTree("spec-claims-");
    for (const held of [claim(), claim({ phase: "5", sessionId: "s2" })]) takeClaim(tree.root, held, never);
    expect(pruneClaims(tree.root, "s9", (held) => held.phase === "4", new Date())).toEqual([claim()]);
    expect(readdirSync(tree.root)).toEqual(["alpha#5.json"]);
  });
});

describe("loadClaims", () => {
  test("lists claims, names unreadable files, ignores temp and displaced files", () => {
    tree = createTree("spec-claims-");
    takeClaim(tree.root, claim(), never);
    tree.write("beta#1.json", "nope");
    tree.write("alpha#4.json.tmp-s3", "{}");
    tree.write("alpha#4.json.stale-s3", "{}");
    expect(loadClaims(tree.root)).toEqual({ claims: [claim()], unreadable: ["beta#1.json"] });
  });

  test("a missing folder has no claims", () => {
    expect(loadClaims("/no/such/claims")).toEqual({ claims: [], unreadable: [] });
  });

  test("claimFile names the file by spec and phase", () => {
    expect(claimFile("/c", "alpha", "9.10")).toBe("/c/alpha#9.10.json");
  });
});

describe("races between processes", () => {
  const ROUNDS = 8;
  const TAKERS = ["r1", "r2", "r3", "r4"];
  const taker = join(import.meta.dir, "fixtures", "claim-taker.ts");

  async function race(dir: string, mode: "fresh" | "stale"): Promise<string[]> {
    const startAt = String(Date.now() + 600);
    const runs = TAKERS.map((sessionId) => Bun.spawn(["bun", taker, dir, sessionId, startAt, mode], { stdout: "pipe", stderr: "pipe" }));
    return Promise.all(runs.map(async (run) => `${await new Response(run.stdout).text()}${await new Response(run.stderr).text()}`.trim()));
  }

  test("four takers on a free phase: exactly one wins", async () => {
    tree = createTree("spec-claims-race-");
    const rounds = await Promise.all(Array.from({ length: ROUNDS }, (_, round) => race(join(tree.root, `r${round}`), "fresh")));
    for (const outcomes of rounds) expect(outcomes.sort()).toEqual(["held", "held", "held", "taken"]);
  });

  // Another taker may create the claim in the gap after the first displaced the stale one.
  test("four takers on a stale claim: exactly one ends up holding it", async () => {
    tree = createTree("spec-claims-race-");
    const dirs = Array.from({ length: ROUNDS }, (_, round) => join(tree.root, `r${round}`));
    for (const dir of dirs) takeClaim(dir, claim({ sessionId: "dead" }), never);
    const rounds = await Promise.all(dirs.map((dir) => race(dir, "stale")));
    for (const outcomes of rounds) {
      expect(outcomes.filter((outcome) => outcome === "held")).toHaveLength(TAKERS.length - 1);
      expect(outcomes.filter((outcome) => outcome === "took-over" || outcome === "taken")).toHaveLength(1);
    }
  });
});
