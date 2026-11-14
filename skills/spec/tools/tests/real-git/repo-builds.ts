import { Lang, parse, type SgNode } from "@ast-grep/napi";

export interface RepoBuild {
  line: number;
  builder: string;
  where: string;
}

const BUILDERS = /^(repoWithOrigin|joinedRepo|.+\.clone|.+\.addWorktree)$/;
const TEST_SCOPES = new Set(["beforeAll", "beforeEach", "afterAll", "afterEach", "test", "it", "describe"]);
const ONCE_PER_FILE = "beforeAll";
const AT_COLLECTION = "collection time";
const FUNCTION_KINDS: ReadonlySet<string> = new Set(["arrow_function", "function_expression"]);

export function repoBuildsOutsideBeforeAll(source: string): RepoBuild[] {
  const root = parse(Lang.TypeScript, source).root();
  const helpers = new Set(builderCalls(root, BUILDERS).flatMap((call) => helperNameAround(call) ?? []));
  const builds = [...builderCalls(root, BUILDERS), ...builderCalls(root, namesPattern(helpers))];
  return builds
    .filter((call) => helperNameAround(call) === undefined)
    .map((call) => ({ line: call.range().start.line + 1, builder: calleeOf(call), where: scopeOf(call) }))
    .filter(({ where }) => where !== ONCE_PER_FILE)
    .sort((a, b) => a.line - b.line);
}

function builderCalls(root: SgNode, names: RegExp | undefined): SgNode[] {
  if (!names) return [];
  return root.findAll({ rule: { kind: "call_expression" } }).filter((call) => names.test(calleeOf(call)));
}

function namesPattern(names: ReadonlySet<string>): RegExp | undefined {
  return names.size === 0 ? undefined : new RegExp(`^(${[...names].join("|")})$`);
}

function calleeOf(call: SgNode): string {
  return call.field("function")?.text() ?? "";
}

// A named function (declaration or `const name = () => …`) is a helper: its calls are judged where it is called.
function helperNameAround(call: SgNode): string | undefined {
  for (let node = call.parent(); node; node = node.parent()) {
    if (node.kind() === "call_expression" && TEST_SCOPES.has(rootIdentifier(calleeOf(node)))) return undefined;
    if (node.kind() === "function_declaration") return node.field("name")?.text();
    const holder = node.parent();
    if (FUNCTION_KINDS.has(String(node.kind())) && holder?.kind() === "variable_declarator") return holder.field("name")?.text();
  }
  return undefined;
}

function scopeOf(call: SgNode): string {
  for (let node = call.parent(); node; node = node.parent()) {
    if (node.kind() !== "call_expression") continue;
    const scope = rootIdentifier(calleeOf(node));
    if (TEST_SCOPES.has(scope)) return scope === "describe" ? AT_COLLECTION : scope;
  }
  return AT_COLLECTION;
}

function rootIdentifier(callee: string): string {
  return /^[A-Za-z_$][\w$]*/.exec(callee)?.[0] ?? "";
}
