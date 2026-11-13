import { afterAll, describe, expect, test } from "bun:test";
import { isAlive, livePid, readText } from "../core/pid-file";
import { createTree } from "./tree";

describe("pid files", () => {
  const tree = createTree("spec-pid-file-");
  afterAll(() => tree.cleanup());

  test("a running process is alive and a pid nobody has is not", () => {
    expect(isAlive(process.pid)).toBe(true);
    expect(isAlive(99_999_999)).toBe(false);
  });

  test("readText trims and treats missing or empty files as absent", () => {
    expect(readText(tree.write("a.txt", " hello \n"))).toBe("hello");
    expect(readText(tree.write("empty.txt", "\n"))).toBeUndefined();
    expect(readText(`${tree.root}/missing.txt`)).toBeUndefined();
  });

  test("livePid names the pid only while that process runs", () => {
    expect(livePid(tree.write("me.pid", `${process.pid}\n`))).toBe(process.pid);
    expect(livePid(tree.write("gone.pid", "99999999"))).toBeUndefined();
    expect(livePid(tree.write("junk.pid", "not a pid"))).toBeUndefined();
    expect(livePid(`${tree.root}/none.pid`)).toBeUndefined();
  });
});
