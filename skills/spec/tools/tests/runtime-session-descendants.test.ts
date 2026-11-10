import { expect, test } from "bun:test";
import { isSessionDescendant } from "../runtime/is-session-descendant";
import type { RuntimeSession, SourceRef } from "../runtime/sessions";

const source: SourceRef = { runtime: "codex", key: "native" };
function session(id: string, parent?: string, binding = source): RuntimeSession {
  return { ref: { source: binding, id }, cwd: "/pilot", status: "busy", observedAt: "now", changedAt: "now", changedFrom: "updatedAt",
    ...(parent ? { parent: { source: binding, id: parent } } : {}) };
}

test("direct and nested observed descendants are independent of snapshot order", () => {
  const own = session("own");
  const child = session("child", "own");
  const grandchild = session("grandchild", "child");
  for (const rows of [[own, child, grandchild], [grandchild, child, own]]) {
    expect(isSessionDescendant(child, own.ref, rows)).toBe(true);
    expect(isSessionDescendant(grandchild, own.ref, rows)).toBe(true);
    expect(isSessionDescendant(own, own.ref, rows)).toBe(false);
  }
});

test("independent roots, another root's child, ancestors and siblings gain no exemption", () => {
  const root = session("root");
  const own = session("own", "root");
  const sibling = session("sibling", "root");
  const other = session("other");
  const otherChild = session("other-child", "other");
  const rows = [root, own, sibling, other, otherChild];
  for (const candidate of [root, sibling, other, otherChild]) expect(isSessionDescendant(candidate, own.ref, rows)).toBe(false);
});

test("missing or cyclic ancestry cannot certify delegation", () => {
  const own = session("own");
  const rows = [own, session("missing", "absent"), session("self", "self"), session("cycle-a", "cycle-b"), session("cycle-b", "cycle-a")];
  for (const candidate of rows.slice(1)) expect(isSessionDescendant(candidate, own.ref, rows)).toBe(false);
});

test("every parent edge retains runtime and source qualification", () => {
  const own = session("own");
  for (const binding of [{ runtime: "codex", key: "other" }, { runtime: "claude", key: "native" }] satisfies SourceRef[]) {
    const foreign = session("child", "own", binding);
    const crossParent: RuntimeSession = { ...session("cross"), parent: foreign.ref };
    const forgedEdge: RuntimeSession = { ...foreign, parent: own.ref };
    const rows = [own, foreign, crossParent, forgedEdge];
    for (const candidate of [foreign, crossParent, forgedEdge]) expect(isSessionDescendant(candidate, own.ref, rows)).toBe(false);
  }
});
