import { gitAt, gitCommonDir, stateDirIn } from "../core/git";
import { systemAsyncRunner, systemRunner } from "../core/run";
import { loadSettings } from "../playbook/settings";
import { recordWorld, sendRecordIntent } from "../plan/record-send";
import { answererOf } from "../questions/who";
import { fetchRecordTip } from "../record/ref";
import { defaultClaudeHome } from "../sessions/live";
import { answerFromPage } from "./answer";
import { loadPageModel } from "./load";
import { clearPageState, writePageState } from "./process";
import { refresher, TICK_MS } from "./refresh";
import { startPageServer, type PageServer } from "./server";

const PORTS_TRIED = 10;
const TIP_TIMEOUT_MS = 4_000;

// The detached server process. Answers carry no session id: they are the person's, not the session's that
// happened to start the server, so no session document is stamped.
export async function servePage(projectDir: string, port: number, version: string): Promise<string> {
  const git = gitAt(projectDir, systemRunner);
  const common = gitCommonDir(git);
  if (!common.ok) return `page: ${common.reason}`;
  const stateDir = stateDirIn(common.value, "page");
  const env = { ...process.env, CLAUDE_CODE_SESSION_ID: undefined };
  const phaseDeps = { runner: systemRunner, env, now: () => new Date() };
  const boardOn = loadSettings(projectDir).board.record;
  const runners = { runner: systemRunner, asyncRunner: systemAsyncRunner, claudeHome: defaultClaudeHome() };
  const refresh = refresher({
    readTip: () => {
      const tip = boardOn ? fetchRecordTip(git, TIP_TIMEOUT_MS) : undefined;
      return tip?.kind === "at" ? tip.sha : undefined;
    },
    buildModel: () => loadPageModel(projectDir, runners, new Date()),
    now: Date.now,
  });
  const by = answererOf(git);
  let server: PageServer | undefined;
  const stop = () => {
    clearPageState(stateDir, process.pid);
    server?.stop();
    process.exit(0);
  };
  for (let offset = 0; offset < PORTS_TRIED && !server; offset++) {
    server = await listen(port + offset, {
      version,
      refresher: refresh,
      answer: (body) => answerFromPage(body, { send: (intent, plan) => sendRecordIntent(recordWorld(projectDir, phaseDeps), "answer", intent, plan), by, now: () => new Date() }),
      tickMs: TICK_MS,
      onIdle: stop,
    });
  }
  if (!server) return `page: ports ${port}-${port + PORTS_TRIED - 1} are all taken`;
  writePageState(stateDir, { pid: process.pid, port: server.port, version });
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  return `page: serving ${server.url}`;
}

async function listen(port: number, deps: Omit<Parameters<typeof startPageServer>[0], "port">): Promise<PageServer | undefined> {
  try {
    return await startPageServer({ ...deps, port });
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "EADDRINUSE") return undefined;
    throw cause;
  }
}
