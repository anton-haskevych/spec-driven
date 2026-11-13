// Run by record-race.git.test.ts as separate processes, so writers on different clones really race.
import { gitAt } from "../../core/git";
import { gitRecordPort } from "../../record/ref";
import { writeRecord, type RecordPlan } from "../../record/write";
import { isolatedRunner } from "../git-repo";

const LIST = "specs/alpha/list.json";
const [dir, mode, value, startAt, ifVersion] = Bun.argv.slice(2);
if (!dir || !mode || !value || !startAt) throw new Error("usage: record-writer <clone> <add|set> <value> <startAt> [ifVersion]");

const addItem: RecordPlan = (view) => {
  const items = (view.doc(LIST) as { items?: string[] } | undefined)?.items ?? [];
  return { ops: [{ op: "replace", path: LIST, doc: { items: [...items, value] } }] };
};
const setValue: RecordPlan = () => ({ ops: [{ op: "update", path: LIST, patch: { value }, ...(ifVersion ? { ifVersion } : {}) }] });

const port = gitRecordPort(gitAt(dir, isolatedRunner));
if (!port) throw new Error("no origin");
while (performance.timeOrigin + performance.now() < Number(startAt)) {
  // spin until every writer is ready
}
const written = await writeRecord(port, mode === "add" ? addItem : setValue, { validate: () => [] });
console.log(written.kind === "failed" || written.kind === "offline" ? `${written.kind}: ${written.reason}` : written.kind);
