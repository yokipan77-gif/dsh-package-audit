# DSH Package Audit

Read-only release checks for DeepSeek Harness plugin authors. This is an independent developer CLI, not an official validator or an installable DSH bundle. It does not load plugin code, install plugins or call a model API.

Requires Node.js 22.17 or later.

```sh
npm ci
node bin/audit.mjs /path/to/plugin
node bin/audit.mjs /path/to/plugin --json
npm test
```

Exit codes: 0 for no errors, 1 for audit findings, 2 for invalid CLI arguments. An audit passing is not a security review or proof that the plugin runs.

Contract reference: [DeepSeek package manifest types](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/util/package-manifest/src/types.ts), inspected 2026-11-07. DSH is evolving; unsupported declarations are reported conservatively.

Development was assisted by Codex. Tests and limitations are part of the repository so results can be reproduced.
