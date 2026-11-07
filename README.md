# DSH Package Audit

[中文说明](README.zh.md)

Read-only release checks for DeepSeek Harness plugin authors. This is an independent developer CLI, not an official validator or an installable DSH bundle. It does not load plugin code, install plugins or call a model API.

Requires Node.js 22.17 or later.

```sh
npm ci
node bin/audit.mjs /path/to/plugin
node bin/audit.mjs /path/to/plugin --json
npm test
npm run check
```

Exit codes: 0 for no errors, 1 for audit findings, 2 for invalid CLI arguments. An audit passing is not a security review or proof that the plugin runs.

Contract reference: [DeepSeek package manifest types](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/util/package-manifest/src/types.ts), inspected 2026-11-07. DSH is evolving; unsupported declarations are reported conservatively.

Development was assisted by Codex. Tests and limitations are part of the repository so results can be reproduced.

To catch files that exist locally but are omitted from publication, run `npm pack --dry-run --json --ignore-scripts` in the plugin directory and save its JSON output outside that directory. Pass it with `--packlist /path/to/pack.json`. Build the plugin first: lifecycle scripts are deliberately not run by the audit. The report must match the package name and version; regenerate it after changes. A supplied report can be stale, so this is not a verification of an already-published tarball.

## Checks

- Bundle metadata, single/ordered patch paths, bounded YAML parsing without executing `!!js`.
- Realpath-contained files, emitted main/types/bin/conditional export artifacts and client declaration types.
- Optional icon formats and the host's 256 KiB size limit.
- Packed-file presence using npm's own dry-run report, rather than guessing `files` whitelist semantics.
- `--dsh-version 0.2.2-rc.1` and `--platform win32`: explicit compatibility targets. `engines.dsh` overrides DSH peers, following the [host implementation](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/boot/app-boot/src/plugin-compatibility.ts). Prereleases participate; supported workspace shortcuts apply only to peers.
- `--workspace`: npm workspace members with a `dsh` declaration; ordinary libraries are skipped. Member failures propagate to the process exit code.
- `--sarif`: SARIF 2.1.0 for CI consumers. `--fail-on-warning` makes advisory findings fail CI; notes do not fail it. `--json` and `--sarif` are mutually exclusive.

## Validation and limits

`npm run check` runs behavior tests and a real, offline npm pack smoke test. The smoke test verifies a good fixture, reproduces an omitted patch, checks the auditor's own distribution and asserts that lifecycle scripts did not run. CI covers Node 22/24 on Windows and Linux.

This CLI is not published to npm yet. Use this checkout. It does not model the full Cordis composer, profile compatibility exemptions or runtime behavior. Export patterns and fallback arrays are explicitly marked unverified. Workspace discovery supports package.json arrays and `{ packages: [...] }`, not pnpm-workspace.yaml or exclusion patterns. Limits: manifest/patch 1 MiB, pack report 8 MiB, 2000 workspace members. JSON reports include absolute local root paths; SARIF artifact locations are relative.

The audit checks every DSH-declaring workspace member as an installable bundle; internal client-only libraries may legitimately fail that contract. The minimal example is an inert packaging fixture, not an advertised plugin feature.
