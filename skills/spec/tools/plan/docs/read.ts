import { isRecord, type FrontmatterData } from "../../core/frontmatter";

// What a document reader returns: the document when it has no problems, and every problem found.
export interface DocRead<T> {
  doc?: T;
  problems: string[];
}

export function readObject<T>(value: unknown, kind: string, read: (fields: FrontmatterData, problems: string[]) => T): DocRead<T> {
  if (!isRecord(value)) return { problems: [`a ${kind} document must be a JSON object`] };
  const problems: string[] = [];
  const doc = read(value, problems);
  return problems.length > 0 ? { problems } : { doc, problems };
}
