# DSH Package Audit

`v0.1.0` · `Node.js >= 22.17` · `JSON / SARIF 2.1.0 / Markdown / NDJSON` · [MIT License](LICENSE) · [English](README.md)

给 DeepSeek Harness 插件作者使用的**发布前检查工具**。离线读取本地包，找出清单、构建产物和打包内容的问题。它是独立开发者 CLI，不是 DeepSeek 官方工具，也不是可装进 DSH 的 bundle。

需要 Node.js 22.17+。尚未发布到 npm，直接从本仓库运行：

```sh
git clone https://github.com/yokipan77-gif/dsh-package-audit.git
cd dsh-package-audit
npm ci --ignore-scripts
node bin/audit.mjs ../your-plugin --dsh-version 0.2.2-rc.1
npm run check
```

| 检查 | 能发现的问题 |
|---|---|
| Bundle 清单 | 只有 dsh.client、缺 patch、空的 patch 列表 |
| 文件路径 | 文件未构建、路径越界、符号链接指向包外、目录误当文件 |
| 安装补丁 | YAML 语法错误、重复键、根类型不对；动态表达式只提示，不执行 |
| 构建入口 | main/types/bin/具体 exports 目标缺失、client 字段类型错误 |
| 图标 | 可选图标的格式、文件是否存在、256 KiB 上限 |
| 打包内容 | 代码仓库里有文件，但 npm pack 的实际文件清单里没有 |
| 宿主兼容性 | engines.dsh 优先于 DSH peer；支持预发布版本和指定平台 |
| Monorepo | 批量检查 npm workspaces 中声明 dsh 的成员，汇总失败项 |
| CI 报告 | JSON、SARIF 2.1.0，以及可选的遇警告失败 |

## 检查真正会发布的文件

先构建你的插件，然后在**插件目录**运行：

```sh
npm pack --dry-run --json --ignore-scripts > ../plugin-pack.json
```

回到本工具目录：

```sh
node bin/audit.mjs ../your-plugin --packlist ../plugin-pack.json --json
node bin/audit.mjs ../monorepo --workspace --json
node bin/audit.mjs ../your-plugin --sarif > findings.sarif
node bin/audit.mjs ../your-plugin --markdown --output audit.md
```

清单应保存在被检查包的目录之外，并在任何改动后重新生成。工具检查包名和版本是否匹配，但无法证明外部清单没有过期。先自行构建；仅对可信代码使用 npm pack，npm 10 即使带 `--ignore-scripts` 也可能执行 `prepare`。本工具只读取已有报告，不会调用 npm。

退出码：0 无错误；1 检查发现问题；2 参数或报告保存错误。`--fail-on-warning` 可让警告也返回 1，普通 note 不会触发。`--output` 原子写入 UTF-8 文件，避免 Windows 重定向编码差异；输出目录必须已存在，并保护已有的审计输入不被覆盖。

图片检查会识别 PNG/JPEG/WebP 文件头，但不执行完整图片解码。本地文件大小与 pack 报告不符时产生 `pack.stale` 警告；这不能证明报告真实。发布验证还会在临时目录中离线安装实际 tarball，再运行安装后的 CLI，检查 JSON、SARIF、Markdown 和 NDJSON 四种报告；依赖缓存由之前的 npm ci 提供，开发依赖不会进入隔离安装。CI 在 Windows/Linux 上覆盖最低 Node 22.17.0 及当前 Node 22/24。

## 范围与限制

新增检查：Node 导出 URL 与条件映射、浏览器构建入口、bundle 显示字段、重复补丁、可选 screenshots.json、pack 报告的包体积预算。截图仅用于 GitHub 展示时不强制放进 npm 包；远程图片不会联网验证。

`--node-version 22.17.0` 检查指定 Node 版本；`--workspace --include-root` 同时检查 npm monorepo 根插件；`--packlist pack.json --max-unpacked-size 5242880` 设置单包解压体积预算。SARIF 结果包含跨机器位置稳定的指纹，方便 CI 去重。

从本地仓库或 tarball 安装后，可导入公开 ESM API：根入口的 audit、`/workspace` 的 auditWorkspace，以及 `/reports` 的 toSarif/toMarkdown/toText/toNDJSON。API 返回报告，不修改进程退出码或自动保存文件；发布验证会检查真实安装后的 API。

`--publish-check` 开启 npm 发布元数据检查，检查 private、publishConfig 的 access/tag/registry 和 scripts 类型。普通审计允许 private 包；发布检查会拒绝它。生命周期脚本只提示名称，不执行、不输出脚本正文；不联网验证注册表权限或版本是否已经存在。

`--platform linux --arch arm64 --libc musl` 检查 npm 的 os/cpu/libc 允许与排除列表，复用 [npm-install-checks](https://github.com/npm/npm-install-checks)；platform 还检查 DSH bundle 平台声明。libc 必须配合显式 Linux 目标；未指定的维度不推断成本机配置，不验证原生二进制兼容性。API 对应 `{ platform: 'linux', arch: 'arm64', libc: 'musl', publishCheck: true }`。

`--packlist -` 从标准输入读取已有 UTF-8 JSON，最多 8 MiB。PowerShell 可运行 `Get-Content -Raw -Encoding utf8 ../pack.json | node bin/audit.mjs ../plugin --packlist - --json`。API 也可直接传入 `packlistContent` 文本。

`--ndjson` 每行一个 JSON 对象：单包为 type=package 的完整报告；workspace 先输出含 packageCount 的 type=workspace 汇总，再按稳定路径顺序输出各包。字符串里的换行会转义；先完成审计再序列化，不是边扫描边输出。四种结构化格式互斥，NDJSON 与 JSON 一样包含本机绝对根路径。

普通 JSON 报告版本为 schemaVersion=1；[`schemas/report-v1.schema.json`](schemas/report-v1.schema.json) 提供 Draft 7 校验规则，覆盖成功、失败、workspace 和包名不可用时的 null。安装后可用 `import schema from '@yokipan77/dsh-package-audit/schema' with { type: 'json' }` 导入。该 Schema 不用于 SARIF 或 NDJSON 的外层记录。

Workspace 的 references 也记录扫描过的普通库清单，虽然这些库不参与 DSH 校验，`--output` 仍拒绝覆盖它们。目录链接按真实包目录去重；清单文件链接不会改变包根目录。workspace 名称中的连续点可以使用，但独立的父目录路径段仍被拒绝。

补充检查：

- Node imports 的本地条件入口与通配符文件会进入文件和漏包检查；外部包映射与 fallback 数组只提示未解析，不加载模块。
- typesVersions 验证编译器版本范围与映射结构，检查明确的声明文件名和通配符产物。多候选、扩展名替换、目录解析仍提示未验证，不选择 TypeScript 编译器版本。
- exports/imports 最多嵌套 64 层。单次通配符扫描在读取到 20000 个目录条目时达到上限，跳过 .git/node_modules，不把目录当文件，不递归目录链接。此限制不用于 workspace 的 glob 发现。
- 256 KiB 以内的 SVG 检查 XML 格式与根元素、命名空间；DTD 和自定义实体不解析、不联网获取。它不是 SVG 渲染或内容净化；位图仍仅检查文件头。
- 使用 npm-package-arg 检查依赖映射、包名、npm specifier 语法和 peer optional 标记。workspace/link/catalog 及文件、Git、远程来源会明确提示未解析；不安装依赖、不验证源是否存在，不在诊断中输出可能带凭据的 specifier 值。

- 不导入插件代码、不执行 `!!js`、不安装插件、不调用模型 API；通过不代表插件安全或能在宿主中正常运行。
- export 通配符会枚举本地构建文件，fallback 数组仍标为未完成运行时解析。
- workspace 支持 package.json 中的数组和 `{ packages: [...] }` 形式，以及 `!` 排除模式；没有 npm workspace 声明时，读取 pnpm-workspace.yaml 的 packages 字段。普通库跳过，声明了 dsh 的成员按可安装插件要求检查。
- 不读取用户 profile 的兼容性豁免，不尝试复现完整 Cordis composer。升级宿主后，应重新核对规则。
- JSON 报告含本机绝对根路径；SARIF 的文件位置相对项目根目录。

规则依据：[官方 manifest 类型](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/util/package-manifest/src/types.ts) 和[官方兼容性判断](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/boot/app-boot/src/plugin-compatibility.ts)，核对于 2026-11-07。

本项目由 Codex 辅助开发。`examples/minimal` 是无实际功能的打包测试样例；`npm run check` 包含行为测试和真实 npm pack 验证。安装链和真实宿主运行尚未验证。
