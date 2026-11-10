# Isolated installation recon

One explore-waves wave: `lifecycle_seam` and `native_lifecycle_research`. Third execution chunk of this session: characterize native installed/cache/trust behavior without live installation changes; then hand off.

## Seam and reuse

- `.codex-plugin/plugin.json:1–39` is metadata/interface only; no entry fence or native hook. `skills/spec/SKILL.md:6–30` contains Claude hooks/interpolation, not a native loaded-version attestation.
- Full actual 2.51.0 tree is available at Git object `22e7ec7`; use `git archive` into the owned scratch environment. `tests/fixtures/runtime-2.51.0/README.md:3–7` explicitly disclaims a complete installation, so those relocated reader files cannot stand in for a native package.
- `scripts/version.py:25–32,47–52` centralizes three declarations. Use it only inside a disposable candidate copy for clearly labelled probe versions; authored manifests remain 2.51.0.
- `plugin-publish/SKILL.md:90–99` selected marketplace upgrade → selected plugin add → native version verification is the existing flow to compare. Its broad sync (`:107–112`) is excluded. Do not invoke publish/bump/live-sync flows.
- CLI 0.167.0 help supports local/Git marketplace add, scoped upgrade, selected-plugin add and list. A child-specific scratch CODEX_HOME plus standalone app-server with an owned Unix socket can isolate writes without daemon management. Local metadata auth requirements remain experimental.

## Proof surfaces and limits

- `PluginSummary.localVersion` means materialized version; advertised version is separate. `skills/list(forceReload:true)` is fresh disk catalog discovery, not a running thread's loaded plugin identity.
- `hooks/list(threadId)` exposes native loaded-thread hook metadata, sourcePath/currentHash/trustStatus/enabled. No hook-trust mutation method exists in the generated client request surface. Positive trust requires actual native review; no trust-store writes or bypass flags.
- `codex resume <id> --no-daemon -C <scratch>` is a CLI route; app-server resume alone cannot certify it. Desktop has no demonstrated isolated profile route. Do not start the live desktop app.
- A local-directory source may use a mutable `local` cache; measure rather than infer immutable production Git retention. Prefer an owned loopback Git marketplace if accepted. No external service credential or live auth file is copied.

## Testing-issue estimate

No isolated installer/trust harness exists. The experiment can use actual CLI plus standard Git/Python HTTP and the shared bounded native RPC; no production distribution code is planned. Model-backed resumed execution may require auth absent in the scratch home; that is incomplete proof, not a platform failure. Default tests use sanitized observations only. Native catalog, retained files, loaded hooks and actual resumed model execution remain distinct evidence surfaces.
