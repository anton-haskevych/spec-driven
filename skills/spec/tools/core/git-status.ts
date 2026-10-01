const RENAME_OR_COPY = /^[RC]|^.[RC]/;

// `git status --porcelain -z`: paths are repo-root relative and unquoted. A rename or copy record is
// followed by its source path, which is skipped.
export function parsePorcelainZ(porcelainZ: string): string[] {
  const records = porcelainZ.split("\0");
  const paths: string[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index] ?? "";
    if (record.length > 3) paths.push(record.slice(3));
    if (RENAME_OR_COPY.test(record)) index++;
  }
  return paths;
}
