# DSH Package Audit

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
```

清单应保存在被检查包的目录之外，并在任何改动后重新生成。工具检查包名和版本是否匹配，但无法证明外部清单没有过期。先自行构建；仅对可信代码使用 npm pack，npm 10 即使带 `--ignore-scripts` 也可能执行 `prepare`。本工具只读取已有报告，不会调用 npm。

退出码：0 无错误；1 检查发现问题；2 参数错误。`--fail-on-warning` 可让警告也返回 1，普通 note 不会触发。

## 范围与限制

- 不导入插件代码、不执行 `!!js`、不安装插件、不调用模型 API；通过不代表插件安全或能在宿主中正常运行。
- export 通配符会枚举本地构建文件，fallback 数组仍标为未完成运行时解析。
- workspace 支持 package.json 中的数组和 `{ packages: [...] }` 形式，以及 `!` 排除模式；没有 npm workspace 声明时，读取 pnpm-workspace.yaml 的 packages 字段。普通库跳过，声明了 dsh 的成员按可安装插件要求检查。
- 不读取用户 profile 的兼容性豁免，不尝试复现完整 Cordis composer。升级宿主后，应重新核对规则。
- JSON 报告含本机绝对根路径；SARIF 的文件位置相对项目根目录。

规则依据：[官方 manifest 类型](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/util/package-manifest/src/types.ts) 和[官方兼容性判断](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/boot/app-boot/src/plugin-compatibility.ts)，核对于 2026-11-07。

本项目由 Codex 辅助开发。`examples/minimal` 是无实际功能的打包测试样例；`npm run check` 包含行为测试和真实 npm pack 验证。安装链和真实宿主运行尚未验证。
