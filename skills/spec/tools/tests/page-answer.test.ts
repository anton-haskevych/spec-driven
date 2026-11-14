import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { answerFromPage, type AnswerDeps } from "../page/answer";
import { validateRecordDoc } from "../plan/kinds";
import { questionDocPath } from "../plan/kinds";
import { blobVersion, serializeDoc } from "../record/document";
import { sendIntent } from "../record/outbox";
import { docOf, fakeRecord, seedRecord, type FakeRecord } from "./fake-record";
import { PAGE_NOW, pageDocs } from "./page-fixture";

const Q12 = questionDocPath("schedule-fixes", "q12");

describe("answering a question from the page", () => {
  let record: FakeRecord;
  let outbox: string;
  let deps: AnswerDeps;
  const shown = () => blobVersion(record.filesAt(record.tip).get(Q12) ?? "");

  beforeEach(() => {
    record = fakeRecord();
    seedRecord(record, pageDocs());
    outbox = join(mkdtempSync(join(tmpdir(), "spec-page-answer-")), "outbox");
    deps = {
      send: (intent, plan) => sendIntent(record, outbox, { session: undefined, command: "answer", args: intent }, {}, { validate: validateRecordDoc, pause: async () => {} }, PAGE_NOW, plan),
      by: "Anton",
      now: () => PAGE_NOW,
    };
  });
  afterEach(() => rmSync(join(outbox, ".."), { recursive: true, force: true }));

  test("lands the answer with who and when, at the version the page showed", async () => {
    const reply = await answerFromPage({ spec: "schedule-fixes", id: "q12", text: "No reset", ifVersion: shown() }, deps);
    expect(reply).toEqual({ status: 200, body: { ok: true, line: 'question: q12 answered on phase 3: "No reset" (Anton)' } });
    expect(docOf(record, Q12)).toMatchObject({ answer: { text: "No reset", by: "Anton" } });
  });

  test("a question changed since the page showed it is a conflict, and nothing is written", async () => {
    const before = shown();
    record.landFromAnotherMachine([{ path: Q12, text: serializeDoc({ ...(pageDocs()[Q12] as object), question: "Reset it weekly?" }) }]);
    const tip = record.tip;
    const reply = await answerFromPage({ spec: "schedule-fixes", id: "q12", text: "No reset", ifVersion: before }, deps);
    expect(reply).toEqual({ status: 409, body: { ok: false, line: "q12 changed since this page showed it; here it is as it is now.", conflict: true } });
    expect(record.tip).toBe(tip);
  });

  test("someone answered first: refused with who and what they said", async () => {
    const version = shown();
    await answerFromPage({ spec: "schedule-fixes", id: "q12", text: "Reset daily", ifVersion: version }, { ...deps, by: "Taras" });
    const reply = await answerFromPage({ spec: "schedule-fixes", id: "q12", text: "No reset", ifVersion: version }, deps);
    expect(reply.status).toBe(409);
    expect(reply.body.line).toContain('was answered 2026-11-13T20:00:00+00:00 by Taras: "Reset daily"');
  });

  test("origin unreachable: kept on this machine and said so", async () => {
    record.offline = true;
    const reply = await answerFromPage({ spec: "schedule-fixes", id: "q12", text: "No reset", ifVersion: shown() }, deps);
    expect(reply).toEqual({ status: 202, body: { ok: true, line: "Kept on this machine: origin can't be reached. It is sent with the next write." } });
  });

  test("anything but a well-formed answer is refused before it is sent", async () => {
    const sent: unknown[] = [];
    const counting = { ...deps, send: async (...args: Parameters<AnswerDeps["send"]>) => (sent.push(args), undefined) };
    expect((await answerFromPage("No reset", counting)).status).toBe(400);
    expect((await answerFromPage({ spec: "schedule-fixes", id: "q12", text: "  ", ifVersion: "v" }, counting)).body.line).toBe("an answer needs words");
    expect((await answerFromPage({ spec: "schedule-fixes", id: "c90", text: "x", ifVersion: "v" }, counting)).body.line).toBe("the answer names no question");
    expect((await answerFromPage({ spec: "../x", id: "q12", text: "x", ifVersion: "v" }, counting)).body.line).toBe("the answer names no spec");
    expect((await answerFromPage({ spec: "schedule-fixes", id: "q12", text: "x" }, counting)).body.line).toBe("the answer names no version; reload the page");
    expect(sent).toEqual([]);
  });
});
