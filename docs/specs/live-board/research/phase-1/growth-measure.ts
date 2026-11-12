// Phase 1 growth measurement. Run from the repo root: bun docs/specs/live-board/research/phase-1/growth-measure.ts
// Builds a 3,000-document record on a bare origin in a temp dir, makes 1,000 writes through writeRecord,
// and prints JSON. Never touches a real remote.
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gitAt, type Git } from "../../../../../skills/spec/tools/core/git";
import { serializeDoc } from "../../../../../skills/spec/tools/record/document";
import { RECORD_REF } from "../../../../../skills/spec/tools/record/layout";
import { gitRecordPort } from "../../../../../skills/spec/tools/record/ref";
import { writeRecord } from "../../../../../skills/spec/tools/record/write";
import { isolatedRunner } from "../../../../../skills/spec/tools/tests/git-repo";

const SPECS = 40;
const PHASES = 8;
const CARDS = 2_000;
const SOURCES = 600;
const TAGS = 40;
const WRITES = Number(process.env.WRITES ?? 1_000);
type Shard = "flat" | "by-100";

const cardPath = (n: number, shard: Shard) => (shard === "flat" ? `cards/c${n}.json` : `cards/${Math.floor(n / 100)}/c${n}.json`);

function documents(shard: Shard): Map<string, unknown> {
  const docs = new Map<string, unknown>([["meta.json", { layout: 1 }]]);
  for (let s = 0; s < SPECS; s++) {
    docs.set(`specs/spec-${s}/spec.json`, { name: `spec-${s}`, planVersion: 3, phases: Array.from({ length: PHASES }, (_, p) => String(p + 1)), joinedAt: "2026-11-11T20:00:00Z", joinedFrom: "0".repeat(40), layout: 1 });
    for (let p = 1; p <= PHASES; p++) docs.set(`specs/spec-${s}/phases/${p}.json`, phase(s, p, 0));
  }
  for (let c = 1; c <= CARDS; c++) docs.set(cardPath(c, shard), card(c, 0));
  for (let i = 0; i < SOURCES; i++) docs.set(`sources/c${i + 1}/a.json`, { card: `c${i + 1}`, role: "origin", app: "imessage", occurredAt: "2026-11-01T10:00:00Z", quote: "I like having the Upcoming Events row at the top, now it doesn't show".repeat(2), ref: `msg ${i}` });
  for (let t = 0; t < TAGS; t++) docs.set(`tags/tag-${t}.json`, { name: `Tag ${t}`, kind: "area" });
  return docs;
}

function phase(s: number, p: number, done: number) {
  return { id: String(p), title: `Phase ${p} of spec ${s}`, outcome: "Something a person notices once this phase ships, said in one plain sentence.", file: `phases/phase-${p}-x.md`, needs: p > 1 ? [String(p - 1)] : [], pr: "A", code: true,
    tasks: Array.from({ length: 6 }, (_, t) => ({ id: `${p}.${t + 1}`, text: `Task ${t + 1}: a deliverable line about the length of a real one in a phase file`, done: t < done, ...(t < done ? { evidence: `${"a".repeat(40)} on origin/feat/spec-${s}-pr-a` } : {}) })) };
}

function card(c: number, edits: number) {
  return { id: `c${c}`, title: `Card ${c}: a request from a studio, in their words`, status: edits > 0 ? "doing" : "open", commitment: "asked", priority: "p2", tags: ["tag-1", "tag-2"], coveredBy: [], createdAt: "2026-11-01T10:00:00Z", ...(edits > 0 ? { note: `edited ${edits} times` } : {}) };
}

function run(git: Git, args: string[], stdin?: string): string {
  const result = git.out(args, stdin === undefined ? {} : { stdin });
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

function seed(work: string, git: Git, shard: Shard): void {
  const files = join(work, "seed-files");
  for (const [path, doc] of documents(shard)) {
    mkdirSync(dirname(join(files, path)), { recursive: true });
    writeFileSync(join(files, path), serializeDoc(doc));
  }
  const env = { GIT_INDEX_FILE: join(work, "seed-index"), GIT_WORK_TREE: files };
  const seedGit = gitAt(work, { run: (argv, options = {}) => isolatedRunner.run(argv, { ...options, env: { ...env, ...options.env } }) });
  run(seedGit, ["add", "-A", "."]);
  const tree = run(seedGit, ["write-tree"]);
  const commit = run(git, ["commit-tree", tree, "-m", "record: seed"]);
  run(git, ["push", "-q", "origin", `${commit}:${RECORD_REF}`]);
}

function originSize(origin: Git): Record<string, number> {
  const fields = Object.fromEntries(run(origin, ["count-objects", "-v"]).split("\n").map((line) => line.split(": ")).map(([k, v]) => [k, Number(v)]));
  return { looseKiB: fields.size ?? 0, packKiB: fields["size-pack"] ?? 0, objects: (fields.count ?? 0) + (fields["in-pack"] ?? 0) };
}

async function measure(shard: Shard) {
  const root = mkdtempSync(join(tmpdir(), `record-growth-${shard}-`));
  try {
    const originDir = join(root, "origin.git");
    const raw = gitAt(root, isolatedRunner);
    run(raw, ["init", "-q", "--bare", "origin.git"]);
    run(raw, ["init", "-q", "work"]);
    const work = join(root, "work");
    const git = gitAt(work, isolatedRunner);
    run(git, ["remote", "add", "origin", originDir]);
    seed(work, git, shard);
    const origin = gitAt(originDir, isolatedRunner);
    const seeded = originSize(origin);
    const port = gitRecordPort(git);
    if (!port) throw new Error("no origin");

    const seconds: number[] = [];
    let rng = 7;
    const next = (n: number) => (rng = (rng * 1103515245 + 12345) % 2 ** 31) % n;
    for (let w = 0; w < WRITES; w++) {
      const path = w % 10 < 6 ? `specs/spec-${next(SPECS)}/phases/${next(PHASES) + 1}.json` : cardPath(next(CARDS) + 1, shard);
      const started = performance.now();
      const written = await writeRecord(port, () => ({ ops: [{ op: "update", path, patch: { note: `write ${w}` } }] }), { validate: () => [] });
      seconds.push((performance.now() - started) / 1000);
      if (written.kind !== "landed") throw new Error(`write ${w}: ${written.kind}`);
    }
    const tip = run(origin, ["rev-parse", RECORD_REF]);
    const rootTree = run(origin, ["rev-parse", `${tip}^{tree}`]);
    const cardsTree = run(origin, ["rev-parse", `${tip}:cards`]);
    const largestCardFolder = shard === "flat" ? cardsTree : run(origin, ["rev-parse", `${tip}:cards/0`]);
    const beforeGc = originSize(origin);
    run(origin, ["gc", "-q"]);
    const afterGc = originSize(origin);

    const fresh = join(root, "fresh");
    run(raw, ["init", "-q", "fresh"]);
    const freshGit = gitAt(fresh, isolatedRunner);
    run(freshGit, ["remote", "add", "origin", originDir]);
    const fetchStart = performance.now();
    run(freshGit, ["fetch", "-q", "origin", `+${RECORD_REF}:refs/spec-board-remote/record`]);
    const coldFetchSeconds = (performance.now() - fetchStart) / 1000;

    const sorted = seconds.toSorted((a, b) => a - b);
    return {
      shard, documents: documents(shard).size, writes: WRITES,
      secondsPerWrite: { mean: round(seconds.reduce((a, b) => a + b, 0) / seconds.length), p50: round(sorted[Math.floor(sorted.length / 2)] ?? 0), p95: round(sorted[Math.floor(sorted.length * 0.95)] ?? 0) },
      treeBytes: { root: Number(run(origin, ["cat-file", "-s", rootTree])), cards: Number(run(origin, ["cat-file", "-s", cardsTree])), largestCardFolder: Number(run(origin, ["cat-file", "-s", largestCardFolder])) },
      originKiB: { seeded, afterWritesBeforeGc: beforeGc, afterGc },
      coldFetchSeconds: round(coldFetchSeconds),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function measureRefs(count: number) {
  const root = mkdtempSync(join(tmpdir(), "record-growth-refs-"));
  try {
    const raw = gitAt(root, isolatedRunner);
    run(raw, ["init", "-q", "--bare", "origin.git"]);
    const origin = gitAt(join(root, "origin.git"), isolatedRunner);
    const stream = Array.from({ length: count }, (_, n) => `commit refs/docs/d${n}\ncommitter t <t@t> 1700000000 +0000\ndata 3\n{}\n\n`).join("") + "commit refs/heads/main\ncommitter t <t@t> 1700000000 +0000\ndata 4\nmain\n\n";
    run(origin, ["fast-import", "--quiet"], stream);
    run(raw, ["init", "-q", "clone"]);
    const clone = gitAt(join(root, "clone"), isolatedRunner);
    run(clone, ["remote", "add", "origin", join(root, "origin.git")]);
    const time = (args: string[]) => {
      const started = performance.now();
      run(clone, args);
      return round((performance.now() - started) / 1000);
    };
    return {
      refs: count,
      fetchAllRefsColdSeconds: time(["fetch", "-q", "origin", "+refs/docs/*:refs/docs-remote/*"]),
      fetchAllRefsWarmSeconds: time(["fetch", "-q", "origin", "+refs/docs/*:refs/docs-remote/*"]),
      lsRemoteAllSeconds: time(["ls-remote", "-q", "origin"]),
      fetchMainOnlySeconds: time(["fetch", "-q", "origin", "main"]),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const round = (value: number) => Math.round(value * 1000) / 1000;

const results = { at: new Date().toISOString(), git: run(gitAt(".", isolatedRunner), ["--version"]), flat: await measure("flat"), sharded: await measure("by-100"), separateRefs: measureRefs(3_000) };
console.log(JSON.stringify(results, null, 2));
