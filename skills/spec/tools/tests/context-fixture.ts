import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ContextDeps } from "../commands/context";
import { stubRunner } from "./stub-runner";

export function contextDeps(overrides: Partial<ContextDeps> = {}): ContextDeps {
  return { runner: stubRunner([]), readHeld: () => new Map(), readClaimsHere: () => [], ...overrides };
}

export function createContextFixture() {
  const project = mkdtempSync(join(tmpdir(), "spec-pack-"));
  const spec = () => join(project, "docs", "specs", "checkout");
  const write = (path: string, text: string) => {
    mkdirSync(join(spec(), path, ".."), { recursive: true });
    writeFileSync(join(spec(), path), text);
  };
  write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\n---\n# Checkout\n");
  write("progress.md", "- [x] Phase 1 — Harness → `phases/phase-1.md`\n- [ ] Phase 2 — Aggregate → `phases/phase-2.md`\n");
  write("phases/phase-1.md", "**Goal:** Harness.\n- [x] done\n");
  write("phases/phase-2.md", "**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
  write("ledger/INDEX.md", "- `gotcha-a.md` — [phase 2] — lock by pk\n- `gotcha-b.md` — [phase 1] — old\n");
  write("ledger/gotcha-a.md", "---\nkind: gotcha\napplies-to: [phase 2]\ncreated: a\n---\n");
  write("ledger/gotcha-b.md", "---\nkind: gotcha\napplies-to: [phase 1]\ncreated: a\n---\n");
  write("code-map.md", "| File | Why |\n|---|---|\n| `src/Checkout.java` | aggregate |\n| `src/Other.java` | x |\n");
  return { project, spec, write, cleanup: () => rmSync(project, { recursive: true, force: true }) };
}
