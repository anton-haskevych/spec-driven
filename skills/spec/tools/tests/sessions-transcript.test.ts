import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lastTurnText, parseLastTurn } from "../sessions/transcript";

const line = (entry: object) => JSON.stringify(entry);
const prompt = (text: string) => line({ type: "user", message: { role: "user", content: text } });
const toolResult = () => line({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } });
const said = (text: string) => line({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text }] } });
const toolUse = () => line({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Bash" }] } });

describe("parseLastTurn", () => {
  test("joins the assistant text after the last prompt, across tool rounds", () => {
    const jsonl = [prompt("go"), said("old turn"), prompt("hand off now"), said("Committing."), toolUse(), toolResult(), said("Crew: needs you 0\nHanded off.")].join("\n");
    expect(parseLastTurn(jsonl)).toBe("Committing.\nCrew: needs you 0\nHanded off.");
  });

  test("system, attachment and unreadable lines are skipped", () => {
    const jsonl = [prompt("go"), "{not json", line({ type: "system", content: "x" }), line({ type: "attachment" }), said("done")].join("\n");
    expect(parseLastTurn(jsonl)).toBe("done");
  });

  test("a prompt given as text blocks starts a turn too", () => {
    const blocks = line({ type: "user", message: { role: "user", content: [{ type: "text", text: "go" }] } });
    expect(parseLastTurn([said("before"), blocks, said("after")].join("\n"))).toBe("after");
  });
});

describe("lastTurnText", () => {
  let home: string | undefined;
  afterEach(() => home && rmSync(home, { recursive: true, force: true }));

  test("finds the session's transcript under any project folder", () => {
    home = mkdtempSync(join(tmpdir(), "transcript-"));
    mkdirSync(join(home, "projects", "-trees-checkout-pr-a"), { recursive: true });
    writeFileSync(join(home, "projects", "-trees-checkout-pr-a", "f1a579ba-1.jsonl"), [prompt("go"), said("Handed off.")].join("\n"));
    expect(lastTurnText(home, "f1a579ba-1")).toBe("Handed off.");
  });

  test("no transcript, or no projects folder, is undefined", () => {
    home = mkdtempSync(join(tmpdir(), "transcript-"));
    expect(lastTurnText(home, "f1a579ba-1")).toBeUndefined();
    mkdirSync(join(home, "projects", "x"), { recursive: true });
    expect(lastTurnText(home, "f1a579ba-1")).toBeUndefined();
  });
});
