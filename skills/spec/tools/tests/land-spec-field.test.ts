import { describe, expect, test } from "bun:test";
import { planSpecField, yamlScalar, type SpecFieldEdit } from "../core/land-spec-field";

const claudeMd = (extra = "") => `---\nstatus: active\n${extra}---\n\n# A\n`;

const edit = (overrides: Partial<SpecFieldEdit> = {}): SpecFieldEdit => ({
  spec: "a",
  key: "owner",
  value: "taras",
  same: (current) => current === "taras",
  already: "a is already taras",
  message: "[owner] a taras",
  ...overrides,
});

describe("planSpecField", () => {
  test("sets a missing key and replaces a present one", () => {
    expect(planSpecField(edit(), claudeMd())).toMatchObject({ kind: "write", text: claudeMd("owner: taras\n"), message: "[owner] a taras" });
    expect(planSpecField(edit(), claudeMd("owner: anton\n"))).toMatchObject({ kind: "write", text: claudeMd("owner: taras\n") });
  });

  test("removes the line when the edit has no value", () => {
    const remove = edit({ value: undefined, same: (current) => current === undefined, already: "a already has no owner" });
    expect(planSpecField(remove, claudeMd("owner: anton\n"))).toMatchObject({ kind: "write", text: claudeMd() });
    expect(planSpecField(remove, claudeMd())).toEqual({ kind: "unchanged", reason: "a already has no owner" });
  });

  test("is unchanged when the key already says it, and refuses a file with no frontmatter", () => {
    expect(planSpecField(edit(), claudeMd("owner: taras\n"))).toEqual({ kind: "unchanged", reason: "a is already taras" });
    expect(planSpecField(edit(), "# A\n")).toEqual({ kind: "refused", reason: "a's CLAUDE.md: entry has no frontmatter" });
  });
});

describe("yamlScalar", () => {
  test("writes a name plain when YAML reads it back unchanged, else quoted", () => {
    expect(yamlScalar("Taras Korpach")).toBe("Taras Korpach");
    expect(yamlScalar("anton-haskevych")).toBe("anton-haskevych");
    expect(yamlScalar("a: b")).toBe('"a: b"');
    expect(yamlScalar("#taras")).toBe('"#taras"');
    expect(yamlScalar("42")).toBe('"42"');
  });
});
