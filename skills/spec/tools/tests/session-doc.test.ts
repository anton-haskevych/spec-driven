import { describe, expect, test } from "bun:test";
import { validateRecordDoc } from "../plan/kinds";
import { CLAUDE_CODE_SOURCE, claudeSessionRef, readSessionDoc, sessionDocPath, sessionSlug } from "../sessions/session-doc";
import { sessionDoc } from "./record-factories";

describe("sessionSlug", () => {
  test("is a legal record file name, and two sessions never share one", () => {
    const first = sessionSlug({ source: CLAUDE_CODE_SOURCE, id: "5d1c0a62-9a4e-4a46-b9b0-1f2f6c4d0001" });
    const second = sessionSlug({ source: CLAUDE_CODE_SOURCE, id: "5d1c0a62-9a4e-4a46-b9b0-1f2f6c4d0002" });
    expect(first).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(first).not.toBe(second);
  });

  test("the same id under another runtime or source is another session", () => {
    const id = "abc";
    const slugs = [
      sessionSlug({ source: CLAUDE_CODE_SOURCE, id }),
      sessionSlug({ source: { runtime: "claude", key: "other" }, id }),
      sessionSlug({ source: { runtime: "codex", key: CLAUDE_CODE_SOURCE.key }, id }),
    ];
    expect(new Set(slugs).size).toBe(3);
  });

  test("odd characters in an id stay legal and distinct", () => {
    const slugs = ["a/b", "a b", "a:b", 'a"b'].map((id) => sessionSlug({ source: CLAUDE_CODE_SOURCE, id }));
    for (const slug of slugs) expect(slug).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(new Set(slugs).size).toBe(4);
  });
});

describe("claudeSessionRef", () => {
  test("a Claude session id becomes a ref under the one Claude source", () => {
    expect(claudeSessionRef({ CLAUDE_CODE_SESSION_ID: "s1" })).toEqual({ source: CLAUDE_CODE_SOURCE, id: "s1" });
  });

  test("no id, no ref", () => {
    expect(claudeSessionRef({})).toBeUndefined();
  });
});

describe("readSessionDoc", () => {
  test("a full document reads back as written", () => {
    const doc = sessionDoc({ spec: "checkout", branch: "feat/checkout", title: "execute checkout 2", planVersion: 7, ahead: 3, edited: 5 });
    expect(readSessionDoc(JSON.parse(JSON.stringify(doc)))).toEqual({ doc, problems: [] });
  });

  test("optional fields may be absent", () => {
    const doc = sessionDoc();
    expect(readSessionDoc(doc).doc).toEqual(doc);
  });

  test("every bad field is named", () => {
    const read = readSessionDoc({ ref: { source: { runtime: "vim", key: "" }, id: "" }, who: "", host: 3, tree: "", mode: "dream", lastWriteAt: "yesterday", ahead: -1, edited: 1.5 });
    expect(read.problems).toEqual([
      "ref must be a session reference: { source: { runtime, key }, id }",
      "who must be text",
      "host must be text",
      "tree must be text",
      'mode must be prep, create, review, execute, babysit or overseer, not "dream"',
      "lastWriteAt must be a time like 2026-11-13T10:00:00-08:00",
      "ahead must be a whole number, 0 or more",
      "edited must be a whole number, 0 or more",
    ]);
  });
});

describe("the sessions kind on the record", () => {
  test("a document at its own session's path is stored", () => {
    const doc = sessionDoc();
    expect(validateRecordDoc(sessionDocPath(doc.ref), doc)).toEqual([]);
  });

  test("a document at another session's path is refused", () => {
    const doc = sessionDoc({ ref: { source: CLAUDE_CODE_SOURCE, id: "mine" } });
    const other = sessionDocPath({ source: CLAUDE_CODE_SOURCE, id: "yours" });
    expect(validateRecordDoc(other, doc)).toEqual([`${other}: ref ${JSON.stringify(doc.ref)} does not match the path`]);
  });
});
