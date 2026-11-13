import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { parseFrontmatter, stringField } from "../core/frontmatter";
import { readSpecMeta, type FocusBand, type ShipMode, type SpecMeta } from "../core/spec-meta";
import { parseRelations, type Relation } from "./relations";

// The fields an upgraded spec keeps on the record instead of in CLAUDE.md.
export interface RecordFields {
  status?: string;
  owner?: string;
  focus?: FocusBand;
  ship?: ShipMode;
}

export interface SpecFields {
  status?: string;
  meta: SpecMeta;
  relations: Relation[];
  // The first H1 of CLAUDE.md.
  title?: string;
}

const H1 = /^#[ \t]+(.+?)\s*$/m;

// The one reader of a spec's fields in either home: with `fromRecord`, the record is the home of its four
// fields, set or not; everything else comes from CLAUDE.md.
export function readSpecFields(specDir: string, fromRecord?: RecordFields): SpecFields {
  const parsed = parseFrontmatter(readTextIfExists(join(specDir, "CLAUDE.md")) ?? "");
  const data = parsed.kind === "ok" ? parsed.data : {};
  const title = parsed.kind === "ok" ? H1.exec(parsed.body)?.[1] : undefined;
  const fileMeta = readSpecMeta(data);
  const meta = fromRecord ? recordMeta(fileMeta, fromRecord) : fileMeta;
  const status = fromRecord ? fromRecord.status : stringField(data, "status");
  return { ...(status ? { status } : {}), meta, relations: parseRelations(data), ...(title ? { title } : {}) };
}

function recordMeta({ focus: _focus, owner: _owner, ownerInvalid: _invalid, ship: _ship, ...rest }: SpecMeta, record: RecordFields): SpecMeta {
  return { ...rest, ...(record.focus ? { focus: record.focus } : {}), ...(record.owner ? { owner: record.owner } : {}), ...(record.ship ? { ship: record.ship } : {}) };
}
