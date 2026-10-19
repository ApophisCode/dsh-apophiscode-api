<p align="center">
  <img src="https://raw.githubusercontent.com/ApophisCode/dsh-apophiscode-api/main/icon-subscription.webp" width="128" height="128" alt="ApophisCode 图标" />
</p>

<h1 align="center">ApophisCode for DSH</h1>

<p align="center">
  在 DeepSeek Harness 中连接 Apophis，让模型对话、工具与 Key 管理融入同一个工作流。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-apophiscode-api"><img src="https://img.shields.io/npm/v/dsh-apophiscode-api?color=6366f1" alt="npm 版本" /></a>
  <a href="https://github.com/ApophisCode/dsh-apophiscode-api/actions/workflows/ci.yml"><img src="https://github.com/ApophisCode/dsh-apophiscode-api/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e" alt="MIT 许可" /></a>
</p>

<p align="center">
  <strong>简体中文</strong> · <a href="https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/README.en.md">English</a>
</p>

<p align="center">
  <a href="https://www.apophis.uk">Apophis 官网</a> ·
  <a href="#功能概览">功能概览</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#更新插件">更新插件</a> ·
  <a href="https://github.com/ApophisCode/dsh-apophiscode-api/releases">发布列表</a> ·
  <a href="#模型目录">模型目录</a> ·
  <a href="#交流与反馈">交流与反馈</a>
</p>

---

ApophisCode 是面向 **DeepSeek Harness（DSH）** 的模型服务插件，默认连接
**[Apophis](https://www.apophis.uk)**。安装后，可在 DSH 的 **ApophisCode** 设置页管理
API Key，并在同名模型分组中选择模型。插件独立管理配置与凭据，可与其他模型服务插件并存。

> 推荐通过 DSH 插件管理器安装 npm 精确版本，可用版本见 [npm](https://www.npmjs.com/package/dsh-apophiscode-api) 与[发布列表](https://github.com/ApophisCode/dsh-apophiscode-api/releases)。
> 真实 DSH 交互记录来自本地 `0.1.0`；新版安装、各型号对话、工具和图片的验收范围见[验证记录](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md)。

## 功能概览

| 能力 | 使用方式 |
| --- | --- |
| **多模型接入** | 按当前启用 Key 的实际模型列表显示，保留服务返回的精确 ID；已有 Responses、Claude Messages 与 Gemini 原生客户端。 |
| **流式对话与工具** | 提供流式输出、推理档位和 DSH 工具调用接口，工具权限与会话历史由 DSH 管理。 |
| **多 Key 管理** | 添加、重命名、选择、停用和删除 Key，保留 Key 轮换及状态提示。 |
| **余额与模型覆盖** | 查看服务返回的余额或额度、公开分组说明，以及当前 Key 可访问的模型目录。 |
| **网页搜索** | 提供 DeepSeek / GPT 搜索后端，只有结构化搜索结果才作为联网结果展示。 |
| **图片生成与编辑** | 使用独立图片 Key，提供图片型号选择、生成与编辑工具入口。 |

功能实现与现场可用性分别验证：设置页、模型选择器、Key 余额和模型目录已有真实成功记录；
搜索、图片及各模型的完整调用结果以[验证记录](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md)为准。

## 快速开始

### 1. 在 DSH 中安装

准备好可运行的 DSH 和从 [Apophis](https://www.apophis.uk) 获取的对话 API Key。
打开 DSH 的 **设置 → 插件 → 添加插件**，在“包名或地址”中填写：

```text
dsh-apophiscode-api@0.1.4
```

点击安装，并确认 **ApophisCode** 已启用。这个入口直接请求 npm 上的指定版本；
安装其他已公开版本时，将 `@` 后的版本号替换为[发布列表](https://github.com/ApophisCode/dsh-apophiscode-api/releases)中的对应版本。
若宿主提示新版本处于发布冷却期，按提示等待后重试。

Release 文件与源码安装见[其他安装方式](#其他安装方式)。

### 2. 确认插件已加载

打开 **设置 → ApophisCode → 插件版本**，核对运行版本与安装目标一致。
若仍显示旧版本、提示待重启，或看不到设置入口，完全退出并重新打开**同版本、同 profile** 的 DSH，再次核对。
刷新浏览器页面不会重载宿主内的插件模块。

### 3. 添加对话 Key

1. 在 **设置 → ApophisCode → 账户与 Key** 中粘贴对话 API Key，填写可选备注并点击 **添加**。
2. 确认目标 Key 显示 **使用中**；添加了多个 Key 时，可点击 **切到此 Key** 指定优先使用的 Key。
3. 默认 API 地址为 `https://www.apophis.uk`。余额与模型目录读取失败时，查看对应错误再排查。

请勿将 API Key 放入 Issue、日志或公开截图。高级地址配置见[安装说明](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/local-installation.md)。

### 4. 选择模型并开始对话

1. 回到会话，在模型选择器的 **ApophisCode** 分组中选择模型。
2. 发送一条简短消息，确认收到正常回答，再按需调整推理档位、模型显示范围和搜索设置。

模型列表来自当前使用中 Key 的接口；能看到某个型号，不代表当前 Key 一定能成功调用它。
具体结果取决于 Key 权限、服务端接口和当前服务状态，错误说明见[常见问题](#常见问题)。
图片工具需另行添加图片 Key 并选择图片型号，验收范围见[验证记录](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md)。

## 更新插件

通过 npm 安装后：

1. 打开 **设置 → ApophisCode → 插件版本**，点击 **检查更新**。
2. 发现新版本时点击 **更新插件**；同一卡片中的 **发布列表** 可查看更新说明与下载文件。
3. 安装完成后重启同版本、同 profile 的 DSH，重新核对运行版本。

更新由使用者主动触发；若提示发布冷却期，等待提示时间后重试。
从本地 `.tgz` 或开发链接安装的副本保持原来源，需在插件管理器中显式安装新的 npm 精确版本。
从旧本地版切换时，先记录当前 profile 和插件版本，保留配置、凭据与会话，按上述安装和加载步骤完成切换。
详细恢复步骤见[安装说明](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/local-installation.md)。

## 其他安装方式

### Release 文件安装

1. 在[发布列表](https://github.com/ApophisCode/dsh-apophiscode-api/releases)中选择版本，下载对应 `.tgz` 和 `SHA256SUMS`，核对下载文件的 SHA-256。
2. 打开 **设置 → 插件 → 添加插件**，在“包名或地址”中填写下载文件的**本机绝对路径**并安装。
3. 按[快速开始](#快速开始)继续核对插件加载状态、添加 Key 并选择模型。

这种安装属于本地文件来源；后续可继续显式安装新文件，或在插件管理器中切换到 npm 精确版本。
CLI 安装、开发链接和恢复流程见[安装说明](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/local-installation.md)。源码构建见[开发与验证](#开发与验证)。

## 模型目录

查看 Apophis 当前公开提供的模型、渠道分组和价格，请访问 **[Apophis 模型广场](https://www.apophis.uk/model-plaza)**。

在 DSH 会话的 **ApophisCode** 分组中选择模型。显示的型号来自当前使用中的对话 Key，
可在 **设置 → ApophisCode → 显示的模型** 中调整显示范围。

实际可调用范围取决于 Key 权限、插件对该型号的支持及服务状态。
图片生成与编辑使用独立的图片 Key 和型号设置；已验证情况见[验证记录](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md)。

## 常见问题

### 安装或更新提示发布冷却期

宿主暂不接受刚发布的版本。按提示的时间等待后，重试同一个精确版本或再次点击更新。
发布列表中存在某个版本，并不代表它已经满足当前 profile 的安装策略。

### 公开分组提示“旧缓存”或连接超时

这表示本次公开目录读取失败，界面保留了上次结果并标记为旧缓存。
它本身不能证明 Key 无效；当前 Key 的模型覆盖与公开目录分别读取。
现场已观察到成功与超时交替出现，尚未确认单一原因，排查结果见[验证记录](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md)。

### 能看到模型，但请求仍然失败

目录 GET 返回某个 ID 不保证模型 POST 可用。请先查看设置页的模型覆盖，
再核对具体错误：`model_not_found`、`503` 与连接超时需要分别排查。
安装成功或余额可读，均不能代替模型调用成功。

### Claude 的 HTTP 与 CLI 选择

默认 `auto` 使用 HTTP，无需安装 Claude Code。仅在明确选择 CLI 传输时才需要本地 CLI；
该模式使用隔离配置，并由 DSH 负责工具与权限。实际 CLI 在 Apophis 上的兼容性仍待验证。

### 卸载与高级地址配置

`apiHost` 默认是 `https://www.apophis.uk`；
DSH 0.2 中地址项由 profile 配置提供，插件设置页只读。
开发安装、地址规则、卸载及恢复流程见[安装说明](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/local-installation.md)。

## 开发与验证

源码构建使用 **Node.js 24 或更高版本**及 **pnpm 10.32.1**；也支持 Node.js 22.19 及以上的 22.x 版本。

```powershell
git clone https://github.com/ApophisCode/dsh-apophiscode-api.git
cd dsh-apophiscode-api
pnpm install --frozen-lockfile
pnpm run check
```

`check` 通过后，安装包位于 `.artifacts/dsh-apophiscode-api-0.1.4.tgz`，可按上述本地文件方式安装。

| 命令 | 用途 |
| --- | --- |
| `pnpm run test` | 运行自动化测试。 |
| `pnpm run build` | 从 `src/` 重新生成 `lib/`。 |
| `pnpm run check` | 运行测试、构建并生成本地安装包。 |
| `node scripts/tool-check.mjs --help` | 查看逐模型工具闭环验收参数。 |

开发命令在完整源码目录中执行；安装包仅包含运行文件、图标、许可与使用文档。
工具验收脚本的正式调用会使用 API 额度，操作与证据要求见[验证记录](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md)。
维护者发行步骤见[发布指南](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/publishing.md)。修改项目之前请阅读 [AGENTS.md](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/AGENTS.md)。

## 交流与反馈

| 渠道 | 适用场景 |
| --- | --- |
| **QQ 交流群：425421707** | 使用交流、配置讨论与经验分享。请在 QQ 中搜索群号加入。 |
| **[问题与建议](https://github.com/ApophisCode/dsh-apophiscode-api/issues)** | 提交可跟踪的问题反馈、功能建议与改进意见。 |

提交问题时，建议提供 **DSH / 插件版本、模型 ID、复现步骤、预期结果和实际错误**。
日志与截图请先脱敏，移除 API Key、授权头及个人信息。

## 许可

本项目遵循 [MIT License](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/LICENSE)，保留相应版权声明。
随包第三方组件及其许可见 [THIRD_PARTY_NOTICES.md](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/THIRD_PARTY_NOTICES.md)。
