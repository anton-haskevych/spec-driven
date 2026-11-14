import { systemAsyncRunner, systemRunner } from "../core/run";
import { answerFromPage } from "../page/answer";
import { loadPageModel } from "../page/load";
import { refresher } from "../page/refresh";
import { startPageServer } from "../page/server";
import { validateRecordDoc } from "../plan/kinds";
import { parseDoc } from "../record/document";
import { sendIntent } from "../record/outbox";
import { defaultClaudeHome } from "../sessions/live";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRecord, seedRecord } from "./fake-record";
import { pageDocs, pageInputs, pageModel } from "./page-fixture";

// The page with factory data on an in-memory record, for looking at it in a browser: answers really land
// there, so the loop shows end to end. `bun skills/spec/tools/tests/page-preview.ts [port]`.
// `… [port] --repo <dir>` serves this checkout's page over that repo's real board instead, read-only: no
// answers, no state file, so the repo's own `spec.ts page` server keeps running (phase 10aa's check on CRM).
const port = Number(Bun.argv[2] && !Bun.argv[2].startsWith("--") ? Bun.argv[2] : 41_960);
const repoAt = Bun.argv.indexOf("--repo");
const repo = repoAt > 0 ? Bun.argv[repoAt + 1] : undefined;
const record = fakeRecord();
seedRecord(record, pageDocs());
const outbox = join(mkdtempSync(join(tmpdir(), "spec-page-preview-")), "outbox");
const docsAtTip = () => Object.fromEntries([...record.filesAt(record.tip)].map(([path, text]) => [path, parseDoc(text)]));

const runners = { runner: systemRunner, asyncRunner: systemAsyncRunner, claudeHome: defaultClaudeHome() };
const readOnly = async () => ({ status: 403, body: { ok: false, line: "page preview: read-only over a real repo" } });

const server = await startPageServer({
  port,
  version: "preview",
  refresher: repo
    ? refresher({ readTip: () => undefined, buildModel: () => loadPageModel(repo, runners, new Date()), now: Date.now })
    : refresher({ readTip: () => record.tip, buildModel: async () => ({ ok: true, value: pageModel(pageInputs(docsAtTip())) }), now: Date.now }),
  answer: (body) =>
    repo ? readOnly() : answerFromPage(body, {
      send: (intent, plan) => sendIntent(record, outbox, { session: undefined, command: "answer", args: intent }, {}, { validate: validateRecordDoc }, new Date(), plan),
      by: "Anton",
      now: () => new Date(),
    }),
  tickMs: 5_000,
  onIdle: () => process.exit(0),
});
console.log(`page preview: ${server.url}`);
