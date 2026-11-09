#!/usr/bin/env bun
import { join } from "node:path";
import { parseArgs } from "node:util";
import { parseContextRequest } from "./context/request";
import { systemAsyncRunner, systemRunner } from "./core/run";
import { findSpecs } from "./core/spec-folders";
import { inspectCandidate } from "./runtime/codex/candidate";
import { runCodexEntry } from "./runtime/codex/entry";
import { probeCodex } from "./runtime/codex/probe";
import { connectReadOnly } from "./runtime/codex/transport";

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({ args: Bun.argv.slice(2), allowPositionals: true, options: {
    assets: { type: "boolean" }, request: { type: "string" }, revision: { type: "string" }, "legacy-project": { type: "string" },
  } });
  const assets = inspectCandidate(join(import.meta.dir, "../../.."));
  if (!assets.ok) throw new Error(assets.reason);
  if (values.assets && !values.request && positionals.length === 0) {
    console.log(JSON.stringify(assets.value));
    return;
  }
  if (!values.request || !values.revision || !values["legacy-project"] || values.assets) {
    throw new Error("native entry requires --request, --revision and --legacy-project; --assets identifies candidate content only");
  }
  const cwd = process.cwd();
  const result = await runCodexEntry({
    request: parseContextRequest([values.request], (name) => findSpecs(cwd, name).length > 0),
    cwd, legacyProjectDir: values["legacy-project"], revision: values.revision,
    ...(positionals.length ? { command: positionals } : {}),
  }, {
    env: process.env, assets: assets.value, runner: systemRunner, now: () => new Date().toISOString(),
    observe: (request) => probeCodex(request, { runner: systemAsyncRunner, connect: connectReadOnly, observedAt: new Date().toISOString() }),
  });
  console.log(result.ok ? result.value : `native entry: ${result.reason}`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.main) {
  try { await main(); }
  catch (cause) {
    console.log(`native entry: ${cause instanceof Error ? cause.message : String(cause)}`);
    process.exitCode = 1;
  }
}
