---
kind: gotcha
paths: [skills/spec/tools/tests/real-git/**]
created: 2026-11-13T16:10:28-08:00
seen-in: [fast-tests]
---

# `Bun.Transpiler.scanImports` throws on a shebang and misreads generics under the tsx loader

Strip a leading `#!` line before `scanImports`, pick the loader by file extension (`ts` for `.ts`, `tsx` for `.tsx`), and walk only resolved code files: `Bun.resolveSync` also resolves `.json` imports, which `scanImports` then fails to parse as TS.

Why it bites: `scanImports` throws `Unexpected #!/usr/bin/env bun` on any executable script, and with `loader: "tsx"` a generic arrow (`<T>(x: T) => …`) in a `.ts` file reads as JSX and throws `Expected "}" but found ":"`. Both surfaced building the real-git guard's import closure (fast-tests phase 1, 2026-11-13). Compare resolved paths as real paths too: on macOS `tmpdir()` sits behind the `/var` symlink.
